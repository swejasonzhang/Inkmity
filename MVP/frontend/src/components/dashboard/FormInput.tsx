import React, { ChangeEvent, useMemo, useState } from "react";

interface FormInputProps {
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
}) => {
  const isTextField = type === "text";

  const useInternalToggle = !showPasswordToggle && isTextField;

  const [internalVisible, setInternalVisible] = useState(false);

  const effectiveType = useMemo(() => {
    if (showPasswordToggle) {
      return showPassword ? "text" : type;
    }
    if (useInternalToggle) {
      return internalVisible ? "text" : "password";
    }
    return type;
  }, [showPasswordToggle, showPassword, type, useInternalToggle, internalVisible]);

  const renderToggle = useMemo(() => {
    if (showPasswordToggle) {
      return (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-5 text-gray-300 text-sm flex items-center justify-center"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      );
    }
    if (useInternalToggle) {
      return (
        <button
          type="button"
          onClick={() => setInternalVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-5 text-gray-300 text-sm flex items-center justify-center"
        >
          {internalVisible ? "Hide" : "Show"}
        </button>
      );
    }
    return null;
  }, [showPasswordToggle, showPassword, onTogglePassword, useInternalToggle, internalVisible]);

  return (
    <div className="relative">
      <input
        type={effectiveType}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="p-3 rounded-md bg-black/40 border border-gray-500 focus:border-white focus:ring-1 focus:ring-white outline-none placeholder-gray-300 text-white w-full"
        required
      />
      {renderToggle}
      {message && (
        <p className={`text-sm mt-1 ${isValid ? "text-white" : "text-gray-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default FormInput;