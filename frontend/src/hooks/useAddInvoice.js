import { useState } from "react";
import { createInvoice } from "@/api";

export const useAddInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const addInvoice = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setMessage("");
    try {
      const response = await createInvoice(data);
      setSuccess(true);
      setMessage("Invoice added successfully !");
      return response;
    } catch (e) {
      setError(e.message || "Error while adding the invoice.");
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

  return { addInvoice, loading, error, success, message, reset };
}