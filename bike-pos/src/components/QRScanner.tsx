import { Box, Button, Typography } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import React, { useEffect } from 'react';

interface QRScannerProps {
  onScanSuccess: (productData: any) => void;
  onScanError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [scanning, setScanning] = React.useState(false);
  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  
  const startScanning = () => {
    setScanning(true);
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;
    
    const qrCodeSuccessCallback = (decodedText: string) => {
      try {
        const productData = JSON.parse(decodedText);
        stopScanning();
        onScanSuccess(productData);
      } catch (error) {
        if (onScanError) {
          onScanError("QR code format is invalid");
        }
      }
    };
    
    const config = { fps: 10, qrbox: 250 };
    
    html5QrCode.start(
      { facingMode: "environment" }, 
      config, 
      qrCodeSuccessCallback, 
      (errorMessage) => {
        console.log("QR scan error:", errorMessage);
      }
    ).catch(err => {
      console.error("Error starting scanner:", err);
      if (onScanError) {
        onScanError("Unable to access camera");
      }
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

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div id="qr-reader" style={{ width: '100%', maxWidth: '500px' }}></div>
      
      {!scanning ? (
        <Button 
          variant="contained" 
          color="primary" 
          onClick={startScanning}
          sx={{ mt: 2 }}
        >
          Start Scanning
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
    </Box>
  );
};

export default QRScanner;
