import { toast } from "react-hot-toast";

/**
 * Displays a premium custom confirmation toast instead of browser's window.confirm.
 * @param {string} message - The question or prompt to display.
 * @param {function} onConfirm - Callback function executed when user clicks Confirm.
 */
export const confirmToast = (message, onConfirm) => {
  toast((t) => (
    <div className="flex flex-col gap-3 p-1 min-w-[250px]">
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-zinc-800 leading-relaxed flex-1">
          {message}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-2.5">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-800 text-[10px] font-black uppercase tracking-wider rounded transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onConfirm();
          }}
          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded transition cursor-pointer"
        >
          Confirm
        </button>
      </div>
    </div>
  ), {
    duration: 12000,
    position: "top-center",
    style: {
      padding: "12px",
      borderRadius: "16px",
      border: "1px solid #e4e4e7",
      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    }
  });
};
