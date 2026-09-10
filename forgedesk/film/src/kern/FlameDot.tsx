import { merk } from '../brand'

export const FlameDot: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span style={{ color: merk.flame, ...style }}>.</span>
)
