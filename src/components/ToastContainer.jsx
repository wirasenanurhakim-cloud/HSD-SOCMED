import { useToast } from '../hooks/useToast'
import Toast from './Toast'

export default function ToastContainer() {
  const { toasts, closeToast } = useToast()
  return <Toast toasts={toasts} onClose={closeToast} />
}