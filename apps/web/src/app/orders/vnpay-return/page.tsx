import { Suspense } from 'react';
import VNPayReturnClient from './VNPayReturnClient';


export default function VNPayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VNPayReturnClient />
    </Suspense>
  );
}
