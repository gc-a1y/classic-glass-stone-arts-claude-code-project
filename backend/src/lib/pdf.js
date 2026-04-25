import puppeteer from 'puppeteer'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function lineItemsHTML(lineItems) {
  return lineItems.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #2A2A2A; font-size: 13px; color: #F5F5F5; text-transform: capitalize;">${item.material_type}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #2A2A2A; font-size: 13px; color: #F5F5F5;">${item.description}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #2A2A2A; font-size: 13px; color: #888888; text-align: center;">${item.quantity} ${item.unit}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #2A2A2A; font-size: 13px; color: #888888; text-align: right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #2A2A2A; font-size: 13px; color: #B8973A; font-weight: 600; text-align: right;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('')
}

function baseHTML(doc, settings, title) {
  const client = doc.client || {}
  const businessName = settings.business_name || 'Classic Glass & Stone Arts'
  const businessAddress = settings.business_address || ''
  const businessPhone = settings.business_phone || ''
  const businessEmail = settings.business_email || ''

  const totalsHTML = `
    <div style="margin-left: auto; margin-top: 24px; width: 260px;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2A2A2A; font-size: 13px;">
        <span style="color: #888888;">Subtotal</span>
        <span style="color: #F5F5F5;">${formatCurrency(doc.subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2A2A2A; font-size: 13px;">
        <span style="color: #888888;">Tax (${doc.tax_rate}%)</span>
        <span style="color: #F5F5F5;">${formatCurrency(doc.tax)}</span>
      </div>
      ${doc.labor ? `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2A2A2A; font-size: 13px;">
        <span style="color: #888888;">Labor</span>
        <span style="color: #F5F5F5;">${formatCurrency(doc.labor)}</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; font-weight: 700; border-top: 2px solid #B8973A; margin-top: 4px;">
        <span style="color: #F5F5F5;">Total</span>
        <span style="color: #B8973A;">${formatCurrency(doc.total)}</span>
      </div>
    </div>
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #0A0A0A; color: #F5F5F5; padding: 48px; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #B8973A;">
        <div>
          <h1 style="font-size: 22px; font-weight: 800; color: #B8973A; letter-spacing: -0.5px;">${businessName}</h1>
          ${businessAddress ? `<p style="color: #888888; font-size: 12px; margin-top: 4px; line-height: 1.5;">${businessAddress.replace(/\n/g, '<br/>')}</p>` : ''}
          ${businessPhone ? `<p style="color: #888888; font-size: 12px;">${businessPhone}</p>` : ''}
          ${businessEmail ? `<p style="color: #888888; font-size: 12px;">${businessEmail}</p>` : ''}
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 28px; font-weight: 700; color: #F5F5F5; letter-spacing: -0.5px;">${title}</h2>
          <p style="color: #888888; font-size: 12px; margin-top: 4px;">Date: ${formatDate(doc.created_at)}</p>
          ${doc.due_date ? `<p style="color: #888888; font-size: 12px;">Due: ${formatDate(doc.due_date)}</p>` : ''}
          ${doc.invoice_number ? `<p style="color: #B8973A; font-size: 13px; font-weight: 600; margin-top: 6px;">${doc.invoice_number}</p>` : ''}
        </div>
      </div>

      <!-- Bill To -->
      <div style="margin-bottom: 32px;">
        <p style="font-size: 10px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Bill To</p>
        <p style="font-size: 15px; font-weight: 600; color: #F5F5F5;">${client.name || ''}</p>
        ${client.email ? `<p style="font-size: 13px; color: #888888;">${client.email}</p>` : ''}
        ${client.phone ? `<p style="font-size: 13px; color: #888888;">${client.phone}</p>` : ''}
        ${client.address ? `<p style="font-size: 13px; color: #888888;">${client.address}</p>` : ''}
      </div>

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <thead>
          <tr style="background: #111111;">
            <th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.8px;">Material</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.8px;">Description</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.8px;">Qty / Unit</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 10px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.8px;">Unit Price</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 10px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML(doc.line_items || [])}
        </tbody>
      </table>

      ${totalsHTML}

      ${doc.notes ? `
        <div style="margin-top: 32px; padding: 16px; background: #111111; border-radius: 8px; border: 1px solid #2A2A2A;">
          <p style="font-size: 10px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">Notes</p>
          <p style="font-size: 13px; color: #888888; line-height: 1.6;">${doc.notes}</p>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #2A2A2A; text-align: center;">
        <p style="font-size: 11px; color: #888888;">Thank you for choosing ${businessName}</p>
      </div>
    </body>
    </html>
  `
}

async function renderPDF(html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({
    format: 'Letter',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true,
  })
  await browser.close()
  return pdf
}

export async function generateInvoicePDF(invoice, settings) {
  const html = baseHTML(invoice, settings, 'INVOICE')
  return renderPDF(html)
}

export async function generateEstimatePDF(estimate, settings) {
  const html = baseHTML(estimate, settings, 'ESTIMATE')
  return renderPDF(html)
}
