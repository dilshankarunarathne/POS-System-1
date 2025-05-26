import { Html5Qrcode } from 'html5-qrcode';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Container } from 'react-bootstrap';

interface QRScannerProps {
  onScanSuccess: (productData: any) => void;
  onScanError?: (error: string) => void;
  autoStart?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError, autoStart = true }) => {
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMounted = useRef(true);
  const scannerInitialized = useRef(false);
  
  // Add refs to track scan cooldown and last scanned data
  const lastScanTime = useRef<number>(0);
  const lastScannedData = useRef<string>('');
  const SCAN_COOLDOWN_MS = 2000; // 2 seconds cooldown between processing the same scan
  
  // Add keyboard listener for external scanner input
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;
    const SCANNER_DELAY = 20; // Most barcode scanners send characters very quickly

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
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
  }, [onScanError, onScanSuccess]);
  
  // Improved cleanup function to ensure only one preview exists
  const cleanupAllCameras = async () => {
    // First, try to stop the scanner from the library
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
          console.log("Scanner stopped successfully");
        }
        await scannerRef.current.clear();
        console.log("Scanner cleared successfully");
        scannerRef.current = null;
      } catch (err) {
        console.error("Error cleaning up scanner:", err);
      }
    }
    
    // Explicitly remove all video elements to ensure no duplicates
    const allVideoElements = document.querySelectorAll("#qr-reader video");
    allVideoElements.forEach(element => {
      const video = element as HTMLVideoElement;
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
      video.remove();
    });
    
    // Clear the scanner DOM element completely
    const qrReader = document.getElementById("qr-reader");
    if (qrReader) {
      qrReader.innerHTML = '';
    }
    
    setScanning(false);
    scannerInitialized.current = false;
  };
  
  // Replace the stopScanning function
  const stopScanning = async () => {
    await cleanupAllCameras();
  };
  
  const startScanning = async (retryCount = 0) => {
    // Prevent starting if already initialized or component unmounted
    if (scannerInitialized.current || !isMounted.current) {
      console.log("Scanner already initialized or component unmounted, not starting again");
      return;
    }

    // Make sure we've cleaned up previous instances
    await cleanupAllCameras();
    
    // Wait a moment to ensure complete cleanup before starting new instance
    await new Promise(resolve => setTimeout(resolve, 500));

    setScanning(true);
    setErrorMessage(null);
    scannerInitialized.current = true;
    
    try {
      console.log("Initializing QR scanner...");
      
      // Ensure the QR reader div is properly sized before initialization
      const qrReader = document.getElementById("qr-reader");
      if (qrReader) {
        qrReader.style.width = "100%";
        qrReader.style.minHeight = "300px";
      }
      
      // Give the browser a moment to apply styles
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a completely new scanner instance - remove verbose flag
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      const qrCodeSuccessCallback = (decodedText: string) => {
        try {
          // Check for duplicate scan or if we're still in cooldown period
          const now = Date.now();
          if (
            decodedText === lastScannedData.current && 
            now - lastScanTime.current < SCAN_COOLDOWN_MS
          ) {
            console.log("Duplicate scan detected within cooldown period, ignoring");
            return;
          }
          
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
          
          // Update the last scan time and data
          lastScanTime.current = now;
          lastScannedData.current = decodedText;
          
          // Log successful data for debugging
          console.log("Successfully parsed QR data:", productData);
          
          // Send the data to parent component
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
      
      // Simplify camera constraints - just use facingMode without dimensions
      const cameraConstraints = { facingMode: retryCount === 0 ? "environment" : "user" };
      
      console.log(`Requesting camera access (attempt ${retryCount + 1})...`);
      
      // Simplify config to use direct qrbox value that worked in previous versions
      const config = { 
        fps: 10, 
        qrbox: 250, // Fixed size that worked before
      };
      
      await html5QrCode.start(
        cameraConstraints, 
        config, 
        qrCodeSuccessCallback, 
        (errorMessage) => {
          // Suppress "NotFoundException" errors in console to avoid log spam
          if (!errorMessage.includes("NotFoundException")) {
            console.log("QR scan error details:", errorMessage);
          }
          
          // Only show errors that aren't "NotFoundException"
          if (errorMessage.includes("NotFoundException")) {
            // Don't show this error to the user as it's normal when searching for QR codes
            return;
          }
          
          // For other errors, provide more specific feedback
          if (errorMessage.includes("NotReadableError")) {
            setErrorMessage("Camera not readable. Please try again or use a different device.");
          } else if (errorMessage.includes("NotAllowedError")) {
            setErrorMessage("Camera access denied. Please grant camera permissions.");
          } else if (errorMessage.includes("timeout")) {
            setErrorMessage("Camera connection timed out. Please try again.");
          } else {
            // Generic error with debug info
            console.error("Detailed error:", errorMessage);
            setErrorMessage("Error scanning QR code. Please try again.");
          }
        }
      ).catch(err => {
        console.error("Error starting scanner:", err);
        
        // Try with a different approach if previous attempts failed
        if (retryCount < 2) {
          console.log(`Attempt ${retryCount + 1} failed, trying with different settings...`);
          setScanning(false);
          scannerInitialized.current = false;
          
          // Wait a bit and retry with different constraints
          setTimeout(() => {
            if (isMounted.current) {
              startScanning(retryCount + 1);
            }
          }, 1000);
          return;
        }
        
        if (onScanError) {
          onScanError(`Camera error: ${err.toString().slice(0, 100)}`);
        }
        setErrorMessage("Unable to access camera. Please check permissions and try refreshing the page.");
        setScanning(false);
        scannerInitialized.current = false;
      });
      
      // Simplify video element check
      setTimeout(() => {
        const videoElement = document.querySelector("#qr-reader video");
        if (videoElement && videoElement instanceof HTMLVideoElement) {
          console.log("Video element found and active");
        }
      }, 1000);
      
    } catch (err) {
      console.error("Error creating scanner:", err);
      setScanning(false);
      setErrorMessage("Error initializing camera. Please refresh the page and try again.");
      scannerInitialized.current = false;
    }
  };
  
  // Start scanning with a key to force recreation during remounts
  useEffect(() => {
    isMounted.current = true;
    
    // Ensure all camera resources are cleaned up first
    cleanupAllCameras().then(() => {
      if (autoStart && isMounted.current) {
        // Add a delay before starting to ensure DOM and resources are ready
        setTimeout(() => {
          if (isMounted.current) {
            startScanning();
          }
        }, 1000); // Longer delay for camera initialization
      }
    });
    
    // Clean up function when component unmounts
    return () => {
      isMounted.current = false;
      cleanupAllCameras();
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <Container className="d-flex flex-column align-items-center p-0">
      <div 
        id="qr-reader" 
        style={{ 
          width: '100%', 
          maxWidth: '500px',
          minHeight: '300px', // Enforce minimum height
          position: 'relative',
        }}
      ></div>
      
      <p className="text-center mt-2">
        Position the QR code within the frame to scan
      </p>
      
      {errorMessage && (
        <Alert variant="danger" className="mt-2 w-100" style={{ maxWidth: '500px' }}>
          {errorMessage}
        </Alert>
      )}
      
      {scanning && (
        <p className="text-muted text-center mt-1 small">
          Camera active. If scanning fails, try adjusting lighting or camera angle.
        </p>
      )}
    </Container>
  );
};

export default QRScanner;
