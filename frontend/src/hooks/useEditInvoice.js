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
    
    try {
      console.log("data", data);
      const response = await updateInvoice(id, data);
      setSuccess(true);
      setMessage("Invoice updated successfully !");
      return response;
    } catch (e) {
      setError(e.message || "Error while updating the invoice.");
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