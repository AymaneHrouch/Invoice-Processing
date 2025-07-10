import { useState } from "react";
import { updateInvoice } from "@/api";

export const useEditInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const editInvoice = async (id, data) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setMessage("");
    
    console.log("useEditInvoice - ID:", id);
    console.log("useEditInvoice - Data:", data);
    
    try {
      const response = await updateInvoice(id, data);
      setSuccess(true);
      setMessage("Facture modifiée avec succès !");
      return response;
    } catch (e) {
      setError(e.message || "Erreur lors de la modification de la facture.");
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setMessage("");
  };

  return { editInvoice, loading, error, success, message, reset };
} 