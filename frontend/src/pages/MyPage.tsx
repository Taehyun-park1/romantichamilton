import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function MyPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate('/reserve');
  }, [navigate]);

  return null;
}
