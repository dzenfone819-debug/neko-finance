import React from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface CalculatorNumpadProps {
  amount: string;
  setAmount: (val: string) => void;
  onConfirm: () => void;
}

export const CalculatorNumpad: React.FC<CalculatorNumpadProps> = ({ amount, setAmount, onConfirm }) => {

  const handleClick = (val: string) => {
    // Basic validation to prevent invalid sequences
    if (['+', '-', '*', '/'].includes(val)) {
      if (amount === '' || ['+', '-', '*', '/'].includes(amount.slice(-1))) {
         // Don't add operator if empty or last char is operator
         if (amount !== '' && val !== amount.slice(-1)) {
            // Replace last operator
            setAmount(amount.slice(0, -1) + val);
         }
         return;
      }
    }
    if (val === '.' && amount.split(/[\+\-\*\/]/).pop()?.includes('.')) {
        return; // Prevent multiple dots in one number segment
    }
    setAmount(amount + val);
  };

  const handleDelete = () => {
    setAmount(amount.slice(0, -1));
  };

  const handleEqual = () => {
    try {
        // Safe evaluation
        // eslint-disable-next-line no-new-func
        const result = new Function('return ' + amount)();
        // Format to 2 decimal places if needed, remove trailing zeros
        const formatted = parseFloat(result.toFixed(2)).toString();
        setAmount(formatted);
    } catch (e) {
        // Error (e.g. division by zero implicitly handled by JS as Infinity, but syntax errors catch here)
    }
  };

  // Grid layout: 4 columns
  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '.', '0', '=', '+'
  ];

  return (
    <div className="calculator-numpad">
      <div className="calc-grid">
        {buttons.map((btn) => (
          <motion.button
            key={btn}
            whileTap={{ scale: 0.9, backgroundColor: "rgba(0,0,0,0.1)" }}
            onClick={() => {
                if (btn === '=') handleEqual();
                else handleClick(btn);
            }}
            className={`calc-btn ${['/', '*', '-', '+', '='].includes(btn) ? 'calc-op-btn' : ''} ${btn === '=' ? 'calc-eq-btn' : ''}`}
          >
            {btn}
          </motion.button>
        ))}
      </div>

      <div className="calc-actions">
        <motion.button
            className="calc-action-btn delete"
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
        >
            <Delete size={24} />
        </motion.button>

        <motion.button
            className="calc-action-btn confirm"
            type="button"
            data-testid="confirm-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
                // If there is an equation pending, solve it first, then confirm?
                // Or just confirm the evaluated result?
                // Let's try to evaluate first if it contains operators
                if (['+', '-', '*', '/'].some(op => amount.includes(op))) {
                    try {
                        // eslint-disable-next-line no-new-func
                        const result = new Function('return ' + amount)();
                        const formatted = parseFloat(result.toFixed(2)).toString();
                        setAmount(formatted);
                        // User needs to click again to confirm, or we pass the result up?
                        // Let's just update amount for now so they see the result,
                        // forcing a second click to confirm is safer.
                    } catch (e) {}
                } else {
                    onConfirm();
                }
            }}
        >
            {['+', '-', '*', '/'].some(op => amount.includes(op)) ? '=' : 'Внести 💵'}
        </motion.button>
      </div>
    </div>
  );
};
