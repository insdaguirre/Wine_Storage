// Wine Storage Form Webhook Handler
// Receives form data and writes to Google Sheets

function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Your spreadsheet ID (replace with your actual ID)
    const SPREADSHEET_ID = '1SeBx16Skhzg5NRZR3ghM_sj_SRt6fGS2fgkij7lR9Gw';
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
    // Check if headers exist, add them if not
    if (sheet.getLastRow() === 0) {
      setupHeaders();
    }
    
    // Prepare the row data
    const rowData = [
      data.first_name || '',
      data.last_name || '',
      data.email || '',
      data.phone || '',
      data.cases || '',
      data.price_estimate || '',
      data.comments || '',
      new Date().toLocaleString(),
      data.userAgent || ''
    ];
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    // Log for debugging
    console.log('Data written to sheet:', rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Data added to spreadsheet',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Simple test function that will show the "test" button
function runTest() {
  console.log('Test function executed successfully!');
  console.log('Apps Script is working correctly.');
  return 'Test completed successfully';
}

// Function to set up spreadsheet headers
function setupHeaders() {
  const SPREADSHEET_ID = '1SeBx16Skhzg5NRZR3ghM_sj_SRt6fGS2fgkij7lR9Gw';
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  
  // Add headers
  const headers = [
    'First Name',
    'Last Name', 
    'Email',
    'Phone',
    'Cases',
    'Price Estimate',
    'Comments',
    'Timestamp',
    'User Agent'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  console.log('Headers added to spreadsheet');
}

// Test function for debugging webhook
function testWebhook() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '555-1234',
        cases: '0-10',
        price_estimate: 'Test estimate',
        comments: 'Test comments',
        userAgent: 'Test Agent'
      })
    }
  };
  
  const result = doPost(testData);
  console.log(result.getContent());
}
