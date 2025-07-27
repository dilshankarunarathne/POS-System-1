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
  
  // Enhanced keyboard listener for external scanner input
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;
    let isScanning = false;
    const SCANNER_DELAY = 50; // Increased delay for more reliable detection
    const MIN_BARCODE_LENGTH = 3; // Minimum length for a valid barcode

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT' ||
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      const currentTime = new Date().getTime();
      
      // If there's a significant delay between keypresses, reset the buffer
      if (currentTime - lastKeyTime > 200) {
        barcodeBuffer = '';
        isScanning = false;
      }
      
      // Only block events if we detect scanner input pattern
      const isScannerInput = currentTime - lastKeyTime <= SCANNER_DELAY || isScanning;
      
      if (isScannerInput) {
        // Only prevent default for scanner input
        event.preventDefault();
        event.stopPropagation();
        isScanning = true;
        
        // Handle scanner input...
        if (event.key === 'Enter') {
          event.preventDefault();
          
          if (barcodeBuffer.length >= MIN_BARCODE_LENGTH) {
            console.log('External scanner detected barcode:', barcodeBuffer);
            
            try {
              // Try to parse as JSON first
              let productData;
              try {
                productData = JSON.parse(barcodeBuffer);
                console.log('Parsed JSON from external scanner:', productData);
              } catch (parseError) {
                // If not JSON, treat as simple barcode
                console.log('Treating as simple barcode:', barcodeBuffer);
                productData = { barcode: barcodeBuffer.trim() };
              }
              
              // Check for cooldown
              const now = Date.now();
              if (
                barcodeBuffer === lastScannedData.current && 
                now - lastScanTime.current < SCAN_COOLDOWN_MS
              ) {
                console.log('Duplicate scan detected within cooldown period, ignoring');
                barcodeBuffer = '';
                isScanning = false;
                return;
              }
              
              lastScanTime.current = now;
              lastScannedData.current = barcodeBuffer;
              
              onScanSuccess(productData);
              
            } catch (error) {
              console.error('Error processing external scanner input:', error);
              const message = "QR code format is invalid";
              setErrorMessage(message);
              if (onScanError) {
                onScanError(message);
              }
            }
          }
          
          barcodeBuffer = '';
          isScanning = false;
        } 
        // Handle backspace
        else if (event.key === 'Backspace') {
          event.preventDefault();
          barcodeBuffer = barcodeBuffer.slice(0, -1);
        }
        // Handle normal characters
        else if (event.key.length === 1) {
          barcodeBuffer += event.key;
          
          if (barcodeBuffer.length > 50) {
            console.log('Auto-triggering long barcode:', barcodeBuffer);
            
            try {
              let productData;
              try {
                productData = JSON.parse(barcodeBuffer);
              } catch (parseError) {
                productData = { barcode: barcodeBuffer.trim() };
              }
              
              onScanSuccess(productData);
            } catch (error) {
              console.error('Error processing long barcode:', error);
              const message = "QR code format is invalid";
              setErrorMessage(message);
              if (onScanError) {
                onScanError(message);
              }
            }
            
            barcodeBuffer = '';
            isScanning = false;
          }
        }
      }
      // If not scanner input, but potential start of scan
      else if (event.key.length === 1 && /[a-zA-Z0-9{"]/.test(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Don't prevent default here, let the key go through if it's not scanner input
        barcodeBuffer = event.key;
        isScanning = true;
      }
      
      lastKeyTime = currentTime;
    };

    // Add event listener with high priority
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
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
          
          // Log the raw decoded text for debugging
          console.log("Raw QR scan:", decodedText);
          
          // First try to parse directly
          let productData;
          try {
            productData = JSON.parse(decodedText);
            console.log("Successfully parsed JSON directly", productData);
          } catch (initialError) {
            console.warn("Initial JSON parse failed:", initialError);
            
            // Try with different encodings or formats
            try {
              // Some QR codes might have URL encoded data
              if (decodedText.includes('%')) {
                const decoded = decodeURIComponent(decodedText);
                productData = JSON.parse(decoded);
                console.log("Parsed after URL decoding", productData);
              } else {
                // Remove potential problematic characters
                const cleanedText = decodedText
                  .trim()
                  .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                  .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                  .replace(/^\s*[\r\n]/gm, ''); // Remove empty lines
                
                console.log("Cleaned text:", cleanedText);
                productData = JSON.parse(cleanedText);
                console.log("Parsed after cleaning", productData);
              }
            } catch (secondError) {
              console.warn("Second parse attempt failed:", secondError);
              
              // Handle special cases: just a barcode, or malformed JSON
              if (/^\d+$/.test(decodedText)) {
                // If it's just a numeric barcode, create a simplified object
                productData = { barcode: decodedText };
                console.log("Created barcode object", productData);
              } else {
                // Try to extract barcode or ID from text using regex
                const barcodeMatch = decodedText.match(/"barcode"\s*:\s*"([^"]+)"/);
                const idMatch = decodedText.match(/"id"\s*:\s*"([^"]+)"/);
                
                if (barcodeMatch || idMatch) {
                  productData = {} as Record<string, string>;
                  if (barcodeMatch) productData.barcode = barcodeMatch[1];
                  if (idMatch) productData.id = idMatch[1];
                  console.log("Extracted data using regex", productData);
                } else {
                  throw new Error("Could not parse QR data in any format");
                }
              }
            }
          }
          
          if (!productData) {
            throw new Error("Failed to extract product data");
          }
          
          // Update the last scan time and data
          lastScanTime.current = now;
          lastScannedData.current = decodedText;
          
          // Send the data to parent component
          onScanSuccess(productData);
        } catch (error) {
          console.error("QR parsing error:", error, "Raw text:", decodedText);
          // Provide more helpful error message with raw data for diagnosis
          const message = `QR code could not be processed. Format may be incorrect. ${decodedText.substring(0, 30)}${decodedText.length > 30 ? '...' : ''}`;
          setErrorMessage(message);
          if (onScanError) {
            onScanError(message);
          }
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
          maxWidth: '100%',
          minHeight: '300px', 
          position: 'relative',
          height: 'calc(100vh - 250px)', // Responsive height based on viewport
          maxHeight: '500px', // Maximum height constraint
        }}
        className="mb-3"
      ></div>
      
      {errorMessage && (
        <Alert 
          variant="danger" 
          className="mt-2 w-100" 
          style={{ 
            maxWidth: '100%', 
            fontSize: 'clamp(0.875rem, 2vw, 1rem)' // Responsive font size
          }}
        >
          {errorMessage}
        </Alert>
      )}
      
      {scanning && (
        <p className="text-muted text-center mt-2 small w-100" 
           style={{ 
             maxWidth: '100%', 
             fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
             padding: '0 10px'
           }}>
          Camera active. If scanning fails, try adjusting lighting or camera angle.
          <br />
          <small className="text-success">
            <i className="bi bi-keyboard me-1"></i>
            External scanner ready - scan directly into the page
          </small>
        </p>
      )}
    </Container>
  );
};

export default QRScanner;