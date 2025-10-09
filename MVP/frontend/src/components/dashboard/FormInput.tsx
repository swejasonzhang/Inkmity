import React, { ChangeEvent, InputHTMLAttributes } from "react";

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "name" | "type"> {
  label?: string;
  type: string;
  name: string;
  value: string;
  placeholder?: string;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword?: () => void;
  isValid?: boolean;
  message?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  type,
  name,
  value,
  placeholder,
  showPasswordToggle,
  showPassword,
  onChange,
  onTogglePassword,
  isValid,
  message,
  ...rest
}) => (
  <div className="relative">
    <input
      type={showPasswordToggle && showPassword ? "text" : type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`p-3 rounded-md bg-black/40 border border-gray-500 focus:border-white focus:ring-1 focus:ring-white outline-none placeholder-gray-300 text-white w-full
        ${type === "range" ? "p-0 h-2.5 cursor-pointer accent-white" : ""}`}
      required
      {...rest}
    />
    {showPasswordToggle && (
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-3 top-1/2 -translate-y-5 text-gray-300 text-sm flex items-center justify-center"
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    )}
    {message && (
      <p className={`text-sm mt-1 ${isValid ? "text-white" : "text-gray-400"}`}>
        {message}
      </p>
    )}
  </div>
);

export default FormInput;