import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { salesApi } from '../services/api';

const SaleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSaleDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          setError("Sale ID is missing. Please check the URL.");
          setLoading(false);
          return;
        }

        const response = await salesApi.getById(id);
        setSale(response.data);
      } catch (err: any) {
        console.error("Error fetching sale details:", err);
        setError(err.message || "Failed to load sale details");
      } finally {
        setLoading(false);
      }
    };

    fetchSaleDetails();
  }, [id]);

  if (loading) {
    return <div>Loading sale details...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!sale) {
    return <div className="alert alert-warning">Sale not found</div>;
  }

  return (
    <div>
      <h2>Sale Details</h2>
      <p>Invoice Number: {sale.invoiceNumber}</p>
      <p>Customer: {sale.customer?.name || 'Walk-in Customer'}</p>
      <p>Total: Rs. {sale.total.toFixed(2)}</p>
      {/* Add more sale details as needed */}
    </div>
  );
};

export default SaleDetails;