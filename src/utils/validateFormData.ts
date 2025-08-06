interface FormData {
    date: string;
    title: string;
    note: string;
  }
  
  const validateFormData = (formData: FormData): boolean => {
    const { date, title, note } = formData;
  
    // Check if any field is empty
    if (!date.trim() || !title.trim() || !note.trim()) {
      return false;
    }
  
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }
  
    return true;
  };
  
  export default validateFormData;