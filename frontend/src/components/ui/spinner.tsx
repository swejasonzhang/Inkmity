import YinYang from "./YinYang";

type SpinnerProps = {
  size?: number;
  className?: string;
};

// Brand loader: a spinning yin-yang, used app-wide.
export function Spinner({ size = 24, className }: SpinnerProps) {
  return <YinYang size={size} spin className={className} />;
}
