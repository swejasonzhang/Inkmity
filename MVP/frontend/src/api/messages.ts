import axios from "axios";

export const fetchMessages = async (token: string, userId: string, otherUserId: string) => {
  const res = await axios.get(`http://localhost:5000/api/messages`, {
    params: { userId, otherUserId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const sendMessage = async (token: string, messageData: any) => {
  const res = await axios.post("http://localhost:5000/api/messages", messageData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};