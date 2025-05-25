import { Alert, Box, Button, FormControlLabel, Switch, TextField, Typography } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import React, { useEffect, useState } from 'react';

interface QRScannerProps {
  onScanSuccess: (productData: any) => void;
  onScanError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  
  // Add keyboard listener for external scanner input
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;
    const SCANNER_DELAY = 20; // Most barcode scanners send characters very quickly

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!manualMode || !document.activeElement || document.activeElement.tagName === 'INPUT') {
        return;
      }

      const currentTime = new Date().getTime();
      
      // If there's a delay between keypresses greater than threshold, reset the buffer
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      
      // Process the key if it's part of a barcode
      if (currentTime - lastKeyTime <= SCANNER_DELAY || barcodeBuffer.length > 0) {
        // Enter key usually signifies end of barcode scan
        if (event.key === 'Enter') {
          try {
            const productData = JSON.parse(barcodeBuffer);
            onScanSuccess(productData);
          } catch (error) {
            const message = "QR code format is invalid";
            setErrorMessage(message);
            if (onScanError) {
              onScanError(message);
            }
          }
          barcodeBuffer = '';
        } else {
          barcodeBuffer += event.key;
        }
      }
      
      lastKeyTime = currentTime;
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [manualMode, onScanError, onScanSuccess]);
  
  const startScanning = () => {
    setScanning(true);
    setErrorMessage(null);
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;
    
    const qrCodeSuccessCallback = (decodedText: string) => {
      try {
        // First try to parse directly
        let productData;
        try {
          productData = JSON.parse(decodedText);
        } catch (initialError) {
          // If direct parsing fails, try to clean up the text
          console.log("Initial parse failed, attempting to clean up the string...");
          
          // Remove potential problematic characters
          const cleanedText = decodedText
            .trim()
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
            .replace(/^[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
          
          // Try parsing again
          try {
            productData = JSON.parse(cleanedText);
          } catch (secondError) {
            // Last resort attempt - check if it's a barcode that wasn't meant to be JSON
            if (/^\d+$/.test(decodedText)) {
              // If it's just a numeric barcode, create a simplified object
              productData = { barcode: decodedText };
            } else {
              throw new Error("Could not parse QR data in any format");
            }
          }
        }
        
        // Log successful data for debugging
        console.log("Successfully parsed QR data:", productData);
        
        // Stop scanning and return the data
        stopScanning();
        onScanSuccess(productData);
      } catch (error) {
        console.error("QR parsing error:", error, "Raw text:", decodedText);
        const message = `QR code format is invalid. Raw data: ${decodedText.substring(0, 20)}${decodedText.length > 20 ? '...' : ''}`;
        setErrorMessage(message);
        if (onScanError) {
          onScanError(message);
        }
        // Continue scanning to allow another attempt
      }
    };
    
    const config = { fps: 10, qrbox: 250 };
    
    html5QrCode.start(
      { facingMode: "environment" }, 
      config, 
      qrCodeSuccessCallback, 
      (errorMessage) => {
        // Suppress "NotFoundException" errors in console to avoid log spam
        // These errors are expected when no QR code is in the camera view
        if (!errorMessage.includes("NotFoundException")) {
          console.log("QR scan error:", errorMessage);
        }
        
        // Only show not found errors after a delay to avoid flickering for momentary detection issues
        if (errorMessage.includes("NotFoundException")) {
          // Don't show this error to the user as it's normal when searching for QR codes
          return;
        }
        
        setErrorMessage("Error scanning QR code. Please try again.");
      }
    ).catch(err => {
      console.error("Error starting scanner:", err);
      if (onScanError) {
        onScanError("Unable to access camera");
      }
      setErrorMessage("Unable to access camera. Please check camera permissions.");
      setScanning(false);
    });
  };

  const stopScanning = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setScanning(false);
      }).catch(err => {
        console.error("Error stopping scanner:", err);
      });
    }
  };
  
  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error("Error stopping scanner on unmount:", err);
        });
      }
    };
  }, []);

  // Clear error when starting a new scan
  const handleStartScanning = () => {
    setErrorMessage(null);
    startScanning();
  };

  // Handle manual QR code input
  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      setErrorMessage("Please enter QR code data");
      return;
    }
    
    try {
      // Try to parse as JSON first
      let productData;
      
      try {
        productData = JSON.parse(manualInput);
      } catch (initialError) {
        // If direct parsing fails, check if it's a barcode
        if (/^\d+$/.test(manualInput)) {
          // If it's just a numeric barcode, create a simplified object
          productData = { barcode: manualInput };
        } else {
          throw new Error("Not valid JSON or barcode format");
        }
      }
      
      onScanSuccess(productData);
      setManualInput('');
      setErrorMessage(null);
    } catch (error) {
      const message = "Invalid format. Please enter valid JSON or barcode number.";
      setErrorMessage(message);
      if (onScanError) {
        onScanError(message);
      }
    }
  };

  const toggleMode = () => {
    if (scanning) {
      stopScanning();
    }
    setManualMode(!manualMode);
    setErrorMessage(null);
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <FormControlLabel
        control={
          <Switch 
            checked={manualMode} 
            onChange={toggleMode}
            color="primary"
          />
        }
        label={manualMode ? "Using Scanner Device" : "Using Webcam"}
        sx={{ mb: 2 }}
      />
      
      {!manualMode ? (
        <>
          <div id="qr-reader" style={{ width: '100%', maxWidth: '500px' }}></div>
          
          {!scanning ? (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleStartScanning}
              sx={{ mt: 2 }}
            >
              Start Scanning with Webcam
            </Button>
          ) : (
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={stopScanning}
              sx={{ mt: 2 }}
            >
              Stop Scanning
            </Button>
          )}
          
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Position the QR code within the frame to scan
          </Typography>
        </>
      ) : (
        <Box sx={{ width: '100%', maxWidth: '500px' }}>
          <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
            Ready to receive input from scanner device or enter manually
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Manual QR Code Input"
            variant="outlined"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Paste QR code JSON data here"
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleManualSubmit}
            fullWidth
          >
            Submit Manual Input
          </Button>
          
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            For external scanner device: just scan the QR code directly
          </Typography>
        </Box>
      )}
      
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2, width: '100%', maxWidth: '500px' }}>
          {errorMessage}
        </Alert>
      )}
    </Box>
  );
};

export default QRScanner;
