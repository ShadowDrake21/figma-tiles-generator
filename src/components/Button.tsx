interface ButtonProps {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  background?: string;
  color?: string;
}

export default function Button({
  text,
  onClick,
  disabled = false,
  background,
  color,
}: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background, color }}>
      {text}
    </button>
  )
}