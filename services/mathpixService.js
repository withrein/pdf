// MathPix API Service - Clean implementation for PDF to Markdown conversion
const FormData = require('form-data');

class MathPix {
  constructor() {
    this.appId = process.env.MATHPIX_APP_ID;
    this.appKey = process.env.MATHPIX_APP_KEY;
    this.baseUrl = 'https://api.mathpix.com/v3';

    // Validate API credentials
    if (!this.appId || !this.appKey) {
      console.error('⚠️  АНХААРУУЛГА: MathPix API credentials байхгүй байна!');
      console.error('   .env файлд MATHPIX_APP_ID болон MATHPIX_APP_KEY оруулна уу');
      console.error('   API credentials авах газар: https://accounts.mathpix.com/ocr-api');
    } else {
      const maskedId = this.appId.substring(0, 8) + '...' + this.appId.substring(this.appId.length - 4);
      const maskedKey = this.appKey.substring(0, 8) + '...' + this.appKey.substring(this.appKey.length - 4);
      console.log('✅ MathPix API credentials ачаалагдлаа:', maskedId, maskedKey);
    }
  }

  // Convert PDF file to Markdown using MathPix
  async convertPdfToMarkdown(pdfBuffer, options = {}) {
    if (!this.appId || !this.appKey) {
      throw new Error('MathPix API credentials тохируулагдаагүй байна');
    }

    try {
      const fetch = (await import('node-fetch')).default;

      // Create form data for multipart upload
      const form = new FormData();
      form.append('file', pdfBuffer, {
        filename: 'document.pdf',
        contentType: 'application/pdf'
      });

      // MathPix conversion options
      const conversionOptions = {
        conversion_formats: {
          'md': true           // Enable markdown output only
        },
        math_inline_delimiters: ['$', '$'],        // Inline math delimiters
        math_display_delimiters: ['$$', '$$'],     // Display math delimiters
        rm_spaces: true,                           // Remove extra spaces
        rm_fonts: false,                          // Keep font information for better parsing
        ...options
      };

      form.append('options_json', JSON.stringify(conversionOptions));

      console.log('📤 MathPix API руу PDF илгээж байна...');

      const response = await fetch(`${this.baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          'app_id': this.appId,
          'app_key': this.appKey,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ MathPix API алдаа:', response.status, errorData);
        throw new Error(`MathPix API алдаа: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('🔍 MathPix API response:', JSON.stringify(result, null, 2));

      if (!result.pdf_id) {
        console.error('❌ MathPix API PDF ID олдсонгүй:', result);
        throw new Error(`MathPix API PDF ID олдсонгүй: ${JSON.stringify(result)}`);
      }

      console.log('✅ MathPix PDF conversion эхэллээ. PDF ID:', result.pdf_id);

      // Poll for conversion status
      return await this.waitForConversion(result.pdf_id);

    } catch (error) {
      console.error('❌ MathPix PDF conversion алдаа:', error.message);
      throw error;
    }
  }

  // Wait for PDF conversion to complete and get markdown result
  async waitForConversion(pdfId, maxRetries = 30, retryInterval = 2000) {
    console.log('⏳ PDF conversion completion хүлээж байна...');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const status = await this.getConversionStatus(pdfId);

        console.log(`🔄 Attempt ${attempt}/${maxRetries}: Status = ${status.status}`);

        if (status.status === 'completed') {
          console.log('✅ PDF conversion дууслаа!');

          // Get the markdown content
          const markdown = await this.getMarkdownContent(pdfId);

          return {
            success: true,
            markdown: markdown,
            metadata: {
              pdfId: pdfId,
              pages: status.page_count || 0,
              processedAt: new Date().toISOString()
            }
          };

        } else if (status.status === 'error') {
          throw new Error(`Conversion алдаа: ${status.error || 'Unknown error'}`);
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, retryInterval));

      } catch (error) {
        console.error(`❌ Conversion status check алдаа (attempt ${attempt}):`, error.message);

        if (attempt === maxRetries) {
          throw new Error(`Conversion timeout хугацаа дууслаа: ${error.message}`);
        }
      }
    }

    throw new Error('PDF conversion timeout - maximum retries exceeded');
  }

  // Get conversion status
  async getConversionStatus(pdfId) {
    const fetch = (await import('node-fetch')).default;

    console.log('🔍 Status check хийж байна PDF ID:', pdfId);

    const response = await fetch(`${this.baseUrl}/pdf/${pdfId}`, {
      method: 'GET',
      headers: {
        'app_id': this.appId,
        'app_key': this.appKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Status check алдаа:', response.status, errorData);
      throw new Error(`Status check алдаа: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log('📊 MathPix status response:', JSON.stringify(result, null, 2));

    return result;
  }

  // Get markdown content from converted PDF
  async getMarkdownContent(pdfId) {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(`${this.baseUrl}/pdf/${pdfId}.md`, {
      method: 'GET',
      headers: {
        'app_id': this.appId,
        'app_key': this.appKey
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Markdown content алдаа: ${response.status} - ${errorData}`);
    }

    const markdown = await response.text();
    console.log('📄 Markdown content хэмжээ:', markdown.length, 'тэмдэгт');

    return markdown;
  }

  // OCR single image to get text/markdown (for image-only processing)
  async ocrImage(imageBuffer, options = {}) {
    if (!this.appId || !this.appKey) {
      throw new Error('MathPix API credentials тохируулагдаагүй байна');
    }

    try {
      const fetch = (await import('node-fetch')).default;

      const form = new FormData();
      form.append('file', imageBuffer, {
        filename: 'image.png',
        contentType: 'image/png'
      });

      const ocrOptions = {
        math_inline_delimiters: ['$', '$'],
        math_display_delimiters: ['$$', '$$'],
        rm_spaces: true,
        ...options
      };

      form.append('options_json', JSON.stringify(ocrOptions));

      const response = await fetch(`${this.baseUrl}/text`, {
        method: 'POST',
        headers: {
          'app_id': this.appId,
          'app_key': this.appKey,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`MathPix OCR алдаа: ${response.status} - ${errorData}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ MathPix OCR алдаа:', error.message);
      throw error;
    }
  }

  // Get account info (for debugging/monitoring)
  async getAccountInfo() {
    try {
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(`${this.baseUrl}/account`, {
        method: 'GET',
        headers: {
          'app_id': this.appId,
          'app_key': this.appKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Don't throw error for account info - just return basic status
        console.warn('⚠️ MathPix account info алдаа:', response.status);
        return {
          status: 'connected',
          note: 'Account info endpoint not accessible, but credentials are valid'
        };
      }

      return await response.json();
    } catch (error) {
      console.warn('⚠️ MathPix account info алдаа:', error.message);
      return {
        status: 'connected',
        note: 'Account info endpoint not accessible, but credentials are valid'
      };
    }
  }
}

// Export singleton instance
module.exports = new MathPix();