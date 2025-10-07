import React from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        {/* Custom gradient overlay */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(115deg, #4053E66B 51%, #08003C75 0%)'
        }}></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-md w-full">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
