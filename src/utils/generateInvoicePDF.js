// import { launch } from "puppeteer";
// import { renderFile } from "ejs";
// import path from "path";
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const generateInvoicePDF = async (data) => {
//   const templatePath = path.join(__dirname, "../../mailer/templates/billingInvoice.ejs");
//   const htmlString = await renderFile(templatePath, { data });

//   const browser = await launch({ headless: "new" });
//   const page = await browser.newPage();
//   await page.setContent(htmlString, { waitUntil: "networkidle0" });

//   const pdfBuffer = await page.pdf({
//     format: "A4",
//     printBackground: true,
//   });

//   await browser.close();
//   return pdfBuffer;
// };

// export default generateInvoicePDF;


import * as html_to_pdf from 'html-pdf-node';
import { renderFile } from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateInvoicePDF = async (data) => {
  const templatePath = path.join(__dirname, "../../mailer/templates/billingInvoice.ejs");

  const htmlString = await renderFile(templatePath, { data });

  const file = { content: htmlString };
  const options = {
    format: 'A4', timeout: 60000,
  };

  const pdfBuffer = html_to_pdf.generatePdf(file, options);
  return pdfBuffer;
};

export default generateInvoicePDF;
