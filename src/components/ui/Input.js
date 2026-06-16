import React, { useState } from "react";

/**
 * Reusable, accessible Input field styled with Tailwind CSS
 */
const Input = React.forwardRef(({
  label,
  type = "text",
  name,
  error,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`flex flex-col w-full gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={name}
          className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative w-full">
        <input
          ref={ref}
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-2.5 text-base border rounded-xl transition-all duration-200 outline-none
            bg-white text-zinc-900 border-zinc-200 
            placeholder-zinc-400
            focus:border-blue-500 focus:ring-4 focus:ring-blue-100
            disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed
            ${type === "password" ? "pr-11" : ""}
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-zinc-200"}
          `}
          {...props}
        />

        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <span className="text-xs font-medium text-red-500 mt-0.5 animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
