import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.js',
  import.meta.url
).toString();

export class DocumentToMarkdown {

  async convertToMarkdown(file) {
    const fileType = file.name.split('.').pop().toLowerCase();

    switch(fileType) {
      case 'pdf':
        return await this.pdfToMarkdown(file);
      case 'doc':
      case 'docx':
        return await this.docToMarkdown(file);
      case 'txt':
      case 'md':
        return await this.textToMarkdown(file);
      default:
        throw new Error('Дэмжигдээгүй файл төрөл: ' + fileType);
    }
  }

  async pdfToMarkdown(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdfjs-dist/2.16.105/standard_fonts/'
    }).promise;

    let markdown = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      markdown += `\n## Хуудас ${pageNum}\n\n`;

      let lastY = -1;
      let lineText = '';

      textContent.items.forEach((item, index) => {
        // Шинэ мөр эсэхийг шалгах
        if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 10) {
          markdown += this.processLine(lineText) + '\n\n';
          lineText = '';
        }

        lineText += item.str;

        // Зай нэмэх
        if (index < textContent.items.length - 1) {
          const nextItem = textContent.items[index + 1];
          const gap = nextItem.transform[4] - (item.transform[4] + item.width);
          if (gap > 5) lineText += ' ';
        }

        lastY = item.transform[5];
      });

      // Сүүлийн мөр
      if (lineText) {
        markdown += this.processLine(lineText) + '\n\n';
      }
    }

    return this.cleanMarkdown(markdown);
  }

  processLine(text) {
    if (!text || !text.trim()) return '';

    text = text.trim();

    // Асуулт эсэхийг шалгах (1., 2., 3. гэх мэт)
    if (/^\d+[\.\)]/.test(text)) {
      return `### ${text}`;
    }

    // Хариултын сонголт эсэхийг шалгах (A., B., C., D., E.)
    if (/^[A-EА-Д][\.\)]/.test(text)) {
      return `- **${text.charAt(0)}:** ${text.substring(2).trim()}`;
    }

    // Section гарчиг эсэхийг шалгах
    if (text.includes('ДААЛГАВАР') || text.includes('хэсэг') || text.includes('ХЭСЭГ')) {
      return `# ${text}`;
    }

    // Шалгалтын нэр эсэхийг шалгах
    if (text.includes('шалгалт') || text.includes('ШАЛГАЛТ') || text.includes('Элсэлт')) {
      return `# ${text}`;
    }

    // Математик томьёо эсэхийг шалгах
    if (text.includes('∫') || text.includes('√') || text.includes('Σ') || text.includes('π')) {
      return `$${text}$`;
    }

    // Жирийн текст
    return text;
  }

  cleanMarkdown(markdown) {
    // Давхар зай арилгах
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // Математик тэмдэгт засах
    markdown = markdown.replace(/(\d+)\s*\^\s*(\d+)/g, '$1^$2');
    markdown = markdown.replace(/√(\d+)/g, '√$1');
    markdown = markdown.replace(/(\d+)\/(\d+)/g, '$\\frac{$1}{$2}$');

    // Тусгай тэмдэгтүүд засах
    markdown = markdown.replace(/\s+/g, ' '); // Давхар зайг нэг зай болгох
    markdown = markdown.replace(/^\s+|\s+$/gm, ''); // Мөрийн эхэн төгсгөлийн зайг арилгах

    return markdown;
  }

  async docToMarkdown(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToMarkdown({
      arrayBuffer: arrayBuffer
    });

    // Post-process DOC markdown
    let markdown = result.value;

    // Convert numbered lists to question format
    markdown = markdown.replace(/^(\d+)\.\s+(.+)$/gm, '### $1. $2');

    // Convert lettered lists to option format
    markdown = markdown.replace(/^([A-E])\.\s+(.+)$/gm, '- **$1:** $2');

    return this.cleanMarkdown(markdown);
  }

  async textToMarkdown(file) {
    const text = await file.text();

    // Process plain text line by line
    const lines = text.split('\n');
    let markdown = '';

    lines.forEach(line => {
      markdown += this.processLine(line) + '\n';
    });

    return this.cleanMarkdown(markdown);
  }
}