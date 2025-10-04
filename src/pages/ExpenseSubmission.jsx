import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Upload,
  Receipt,
  DollarSign,
  Calendar,
  FileText,
  Tag,
  Loader,
  X,
  Eye
} from 'lucide-react';

export default function ExpenseSubmission() {
  const { user } = useAuth();
  const { currencies, convertCurrency, formatCurrency } = useCurrency();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    amount: '',
    currency: user?.company?.baseCurrency || 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [convertedPreview, setConvertedPreview] = useState(null);

  const categories = [
    'Travel',
    'Meals',
    'Office Supplies',
    'Equipment',
    'Software',
    'Marketing',
    'Training',
    'Other'
  ];

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setReceipt(file);
      setReceiptPreview(URL.createObjectURL(file));
      processOCR(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  });

  const processOCR = async (file) => {
    setOcrLoading(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      });

      // Enhanced OCR extraction
      // Extract amount using multiple patterns
      const amountPatterns = [
        /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD/g,
        /TOTAL:?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
        /AMOUNT:?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
      ];

      let extractedAmount = null;
      for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          extractedAmount = matches[matches.length - 1].replace(/[$,USD\s]/g, '');
          break;
        }
      }

      // Extract date with better patterns
      const datePatterns = [
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/gi
      ];

      let extractedDate = null;
      for (const pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          const dateStr = matches[0];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            extractedDate = parsedDate.toISOString().split('T')[0];
            break;
          }
        }
      }

      // Extract merchant/vendor name
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      let merchantName = '';
      if (lines.length > 0) {
        // Usually the first non-empty line is the merchant name
        merchantName = lines[0].trim().substring(0, 50); // Limit length
      }

      // Update form with extracted data
      if (extractedAmount) {
        setFormData(prev => ({ ...prev, amount: extractedAmount }));
      }

      if (extractedDate) {
        setFormData(prev => ({ ...prev, date: extractedDate }));
      }

      if (merchantName && !formData.description) {
        setFormData(prev => ({ 
          ...prev, 
          description: `Expense at ${merchantName}` 
        }));
      }

      toast.success('Receipt processed successfully!');
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Failed to process receipt');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit expenses');
      return;
    }

    if (!formData.amount || !formData.category || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    try {
      // Calculate converted amount
      const amount = parseFloat(formData.amount) || 0;
      const convertedAmount = await convertCurrency(
        amount,
        formData.currency,
        user?.company?.baseCurrency || 'USD'
      );

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('amount', formData.amount);
      submitData.append('originalCurrency', formData.currency);
      submitData.append('convertedAmount', convertedAmount.toString());
      submitData.append('baseCurrency', user?.company?.baseCurrency || 'USD');
      submitData.append('category', formData.category);
      submitData.append('description', formData.description);
      submitData.append('date', formData.date);
      
      if (receipt) {
        submitData.append('receipt', receipt);
      }

      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      console.log('Submitting expense with data:', {
        amount: formData.amount,
        currency: formData.currency,
        convertedAmount,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        hasReceipt: !!receipt
      });

      const response = await axios.post('/api/expenses', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      });

      console.log('Expense submission response:', response.data);

      if (response.data.success) {
        toast.success('Expense submitted successfully!');
        setFormData({
          amount: '',
          currency: user?.company?.baseCurrency || 'USD',
          category: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        setReceipt(null);
        setReceiptPreview(null);
        navigate('/dashboard');
      } else {
        throw new Error(response.data.message || 'Failed to submit expense');
      }
    } catch (error) {
      console.error('Submission error:', error);
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // Handle validation errors
          const errorMessages = errorData.errors.map(err => err.message).join(', ');
          toast.error(`Validation error: ${errorMessages}`);
        } else {
          toast.error(errorData.message || 'Invalid data provided');
        }
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 404) {
        toast.error('Expense submission endpoint not found. Please contact support.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('Failed to submit expense. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const removeReceipt = () => {
    setReceipt(null);
    setReceiptPreview(null);
  };

  // Update conversion preview when amount or currency changes
  useEffect(() => {
    const updateConversionPreview = async () => {
      if (formData.amount && formData.currency !== (user?.company?.baseCurrency || 'USD')) {
        try {
          const converted = await convertCurrency(
            parseFloat(formData.amount) || 0,
            formData.currency,
            user?.company?.baseCurrency || 'USD'
          );
          setConvertedPreview(formatCurrency(converted, user?.company?.baseCurrency || 'USD'));
        } catch (error) {
          console.error('Conversion preview error:', error);
          setConvertedPreview(null);
        }
      } else {
        setConvertedPreview(null);
      }
    };

    updateConversionPreview();
  }, [formData.amount, formData.currency, convertCurrency, formatCurrency, user?.company?.baseCurrency]);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="headline text-4xl text-white mb-2">Submit Expense</h1>
          <p className="text-white/70">Upload your receipt and fill in the details</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Receipt Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">Receipt Upload</h2>
            
            {!receiptPreview ? (
              <div
                {...getRootProps()}
                className={`glass-card p-8 border-2 border-dashed transition-all cursor-pointer ${
                  isDragActive 
                    ? 'border-blue-400 bg-blue-400/10' 
                    : 'border-white/30 hover:border-white/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-center">
                  <Upload className="mx-auto text-white/50 mb-4" size={48} />
                  {isDragActive ? (
                    <p className="text-white">Drop the receipt here...</p>
                  ) : (
                    <>
                      <p className="text-white mb-2">Drag & drop your receipt here</p>
                      <p className="text-white/70 text-sm">or click to browse files</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card p-4">
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <Loader className="animate-spin text-white mb-2" size={24} />
                        <p className="text-white text-sm">Processing receipt...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Expense Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">Expense Details</h2>
            
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      required
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    style={{ color: 'white' }}
                  >
                    {currencies.map(currency => (
                      <option 
                        key={currency.code} 
                        value={currency.code} 
                        className="bg-gray-800 text-white"
                        style={{ backgroundColor: '#1f2937', color: 'white' }}
                      >
                        {currency.code} - {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Category
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" className="bg-gray-800">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category} className="bg-gray-800">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-white/50" size={18} />
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter expense description"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {convertedPreview && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-200 text-sm">
                    <strong>Converted Amount:</strong> {convertedPreview}
                  </p>
                  <p className="text-blue-300 text-xs mt-1">
                    Rate updated in real-time
                  </p>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full gradient-button py-3 rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  <>
                    <Receipt size={18} />
                    <span>Submit Expense</span>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
