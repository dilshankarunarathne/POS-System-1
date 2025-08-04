import { forwardRef } from 'react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptProps {
  receipt: {
    invoiceNumber: string;
    date: string;
    customer: string;
    cashier: string;
    items: ReceiptItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
  };
}

const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptProps>(({ receipt }, ref) => {
  // Format currency consistently
  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  return (
    <div ref={ref} className="receipt-content">
      {/* Store Header */}
      <div className="text-center">
        <h4 className="mb-0">Bike Shop</h4>
        <p className="mb-0">123 Bike Street, City</p>
        <p className="mb-0">Tel: 123-456-7890</p>
        <hr />
      </div>

      {/* Receipt Info */}
      <div>
        <p className="mb-0"><strong>Receipt #:</strong> {receipt.invoiceNumber}</p>
        <p className="mb-0"><strong>Date:</strong> {receipt.date}</p>
        <p className="mb-0"><strong>Customer:</strong> {receipt.customer}</p>
        <p className="mb-0"><strong>Cashier:</strong> {receipt.cashier}</p>
        <hr />
      </div>

      {/* Items */}
      <div>
        <p className="fw-bold mb-1">Items:</p>
        <table className="w-100">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th className="amount">Price</th>
              <th className="amount">Total</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td className="amount">{formatCurrency(item.price)}</td>
                <td className="amount">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />
      </div>

      {/* Totals */}
      <div>
        <div className="d-flex justify-content-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(receipt.subtotal)}</span>
        </div>
        
        {receipt.discount > 0 && (
          <div className="d-flex justify-content-between">
            <span>Discount:</span>
            <span>-{formatCurrency(receipt.discount)}</span>
          </div>
        )}
        
        {receipt.tax > 0 && (
          <div className="d-flex justify-content-between">
            <span>Tax:</span>
            <span>{formatCurrency(receipt.tax)}</span>
          </div>
        )}
        
        <hr />
        
        <div className="d-flex justify-content-between fw-bold">
          <span>TOTAL:</span>
          <span>{formatCurrency(receipt.total)}</span>
        </div>
        
        <div className="mt-2">
          <p className="mb-0"><strong>Payment Method:</strong> {receipt.paymentMethod.toUpperCase()}</p>
        </div>
        <hr />
      </div>

      {/* Footer */}
      <div className="text-center mt-2">
        <p className="mb-1">Thank you for your business!</p>
        <p className="mb-0 small">Return policy: Items can be returned within 7 days with receipt</p>
      </div>
    </div>
  );
});

ReceiptPreview.displayName = 'ReceiptPreview';

export default ReceiptPreview;
