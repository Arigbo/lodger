'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

/**
 * Diagnostic component to test direct Firestore access
 * This bypasses the useDoc hook to see if we can read the document directly
 */
export function TestFirestoreAccess({ propertyId }: { propertyId: string }) {
  const firestore = useFirestore();
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    async function testDirectAccess() {
      try {
        console.log('[TestFirestore] Starting direct getDoc test for:', propertyId);
        
        const propertyRef = doc(firestore, 'properties', propertyId);
        console.log('[TestFirestore] Document reference created:', propertyRef.path);
        
        const snapshot = await getDoc(propertyRef);
        
        console.log('[TestFirestore] Snapshot received:', {
          exists: snapshot.exists(),
          id: snapshot.id,
          metadata: snapshot.metadata,
          data: snapshot.exists() ? snapshot.data() : null
        });
        
        setTestResult({
          success: true,
          exists: snapshot.exists(),
          data: snapshot.exists() ? snapshot.data() : null
        });
      } catch (error: any) {
        console.error('[TestFirestore] Error:', {
          code: error.code,
          message: error.message,
          name: error.name
        });
        
        setTestResult({
          success: false,
          error: error.message
        });
      }
    }

    if (firestore && propertyId) {
      testDirectAccess();
    }
  }, [firestore, propertyId]);

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      background: '#000', 
      color: '#0f0', 
      padding: 20, 
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 12,
      maxWidth: 400,
      zIndex: 9999
    }}>
      <h3>🔍 Firestore Direct Access Test</h3>
      <pre>{JSON.stringify(testResult, null, 2)}</pre>
    </div>
  );
}
