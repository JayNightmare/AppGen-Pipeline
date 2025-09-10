/** Minimal Button */
import React from "react";
export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
            }}
        />
    );
}
