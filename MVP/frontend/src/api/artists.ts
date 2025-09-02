import axios from "axios";

export const fetchArtists = async (filters: any) => {
  const query = new URLSearchParams(filters).toString();
  const res = await axios.get(`http://localhost:5000/api/artists?${query}`);
  return res.data;
};

export const fetchArtistById = async (id: string) => {
  const res = await axios.get(`http://localhost:5000/api/artists/${id}`);
  return res.data;
};