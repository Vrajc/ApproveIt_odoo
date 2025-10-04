const Tesseract = require('tesseract.js');
const fs = require('fs');

class OCRService {
  async extractReceiptData(imagePath) {
    try {
      const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
      
      // Extract amount using regex patterns
      const amountPattern = /(\$|USD|€|EUR)?\s*(\d+[.,]\d{2})/gi;
      const amountMatches = text.match(amountPattern);
      
      // Extract date patterns
      const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi;
      const dateMatches = text.match(datePattern);
      
      // Calculate confidence based on text quality
      const confidence = this.calculateConfidence(text);
      
      return {
        extractedText: text.trim(),
        extractedAmount: amountMatches ? parseFloat(amountMatches[0].replace(/[^\d.,]/g, '')) : null,
        extractedDate: dateMatches ? new Date(dateMatches[0]) : null,
        confidence
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        extractedText: '',
        extractedAmount: null,
        extractedDate: null,
        confidence: 0
      };
    } finally {
      // Clean up uploaded file
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
  }

  calculateConfidence(text) {
    // Simple confidence calculation based on text length and common receipt keywords
    const keywords = ['total', 'amount', 'receipt', 'date', 'tax', 'subtotal'];
    const keywordCount = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;
    
    return Math.min((keywordCount / keywords.length) * 100, 100);
  }
}

module.exports = new OCRService();
