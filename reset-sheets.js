// Reset Sheets Connection Script
document.addEventListener('DOMContentLoaded', function() {
    const statusDiv = document.getElementById('status');
    const clearBtn = document.getElementById('clearBtn');
    const checkBtn = document.getElementById('checkBtn');
    
    clearBtn.addEventListener('click', async () => {
        try {
            await chrome.storage.local.remove(['betTrackingSpreadsheetId', 'sheetsAuthenticated']);
            statusDiv.innerHTML = '<p style="color: #00ff88;">✅ Cleared old spreadsheet ID. You can now connect Google Sheets again to use the new template.</p>';
        } catch (error) {
            statusDiv.innerHTML = '<p style="color: #ff4757;">❌ Error: ' + error.message + '</p>';
        }
    });
    
    checkBtn.addEventListener('click', async () => {
        try {
            const data = await chrome.storage.local.get(['betTrackingSpreadsheetId', 'sheetsAuthenticated']);
            statusDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        } catch (error) {
            statusDiv.innerHTML = '<p style="color: #ff4757;">❌ Error: ' + error.message + '</p>';
        }
    });
});
