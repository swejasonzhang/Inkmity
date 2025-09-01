export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

export const validateEmail = (email: string) => emailRegex.test(email);
export const validatePassword = (password: string) => passwordRegex.test(password);