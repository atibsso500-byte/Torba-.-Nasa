import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/language';

export const QuotaBanner: React.FC = () => {
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
    };

    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  if (!isQuotaExceeded) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-between">
      <div className="flex-1 text-center">
        <span>
          {t.quota.quotaReached} {t.quota.ownerNotice}{' '}
          <a
            href="https://developers.google.com/maps/documentation/javascript/error-messages"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold text-amber-950 hover:text-amber-800"
          >
            {t.quota.developerSiteLink}
          </a>
        </span>
      </div>
      <button
        onClick={() => setIsQuotaExceeded(false)}
        className="mx-4 text-amber-800 hover:text-amber-950 font-bold text-xs uppercase tracking-wider px-2 py-0.5 rounded border border-amber-300"
      >
        {t.quota.closeBanner}
      </button>
    </div>
  );
};
