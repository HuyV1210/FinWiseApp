
export const addTransactionToDatabase = async (transaction: {

    date: string;
  
    title: string;
  
    note: string;
  
    userId: string | null;
  
    createdAt: Date;
  
  }) => {
  
    // Simulate adding transaction to a database
  
    return new Promise((resolve, reject) => {
  
      setTimeout(() => {
  
        if (transaction.userId) {
  
          resolve('Transaction added successfully');
  
        } else {
  
          reject(new Error('User ID is required'));
  
        }
  
      }, 1000);
  
    });
  
  };
  