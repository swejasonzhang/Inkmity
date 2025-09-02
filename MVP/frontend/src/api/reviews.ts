import axios from "axios";

export const addReview = async (token: string, reviewData: any) => {
  const res = await axios.post("http://localhost:5000/api/reviews", reviewData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};