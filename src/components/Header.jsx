import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

function Header({ onLoginClick, onRegisterClick, onAboutClick, onHomeClick, logoImage }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full top-0 z-[9999] transition-all duration-300 ${
      scrolled 
        ? 'bg-white shadow-lg' 
        : 'bg-blue-900/95 backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div 
            onClick={onHomeClick}
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            {logoImage ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full blur opacity-75 animate-pulse"></div>
                <img
                  src={logoImage}
                  alt="ELEV8 Logo"
                  className="relative w-12 h-12 object-cover rounded-full ring-2 ring-white"
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">E8</span>
              </div>
            )}
            <div>
              <span className={`text-2xl font-black tracking-tight ${
                scrolled ? 'text-gray-900' : 'text-white'
              }`}>
                ELEV<span className={`text-transparent bg-clip-text bg-gradient-to-r ${
                  scrolled ? 'from-blue-600 to-cyan-600' : 'from-blue-400 to-cyan-400'
                }`}>8</span>
              </span>
              <div className={`text-xs tracking-wider ${
                scrolled ? 'text-gray-600' : 'text-white/90'
              }`}>BILLIARDS</div>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={onHomeClick}
              className={`px-6 py-2.5 rounded-full transition-all duration-300 font-medium ${
                scrolled
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Home
            </button>
            <button
              onClick={onAboutClick}
              className={`px-6 py-2.5 rounded-full transition-all duration-300 font-medium ${
                scrolled
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              About Us
            </button>
            <button
              onClick={onLoginClick}
              className={`px-6 py-2.5 rounded-full transition-all duration-300 font-medium ${
                scrolled
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Log In
            </button>
            <button
              onClick={onRegisterClick}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 font-medium hover:scale-105"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg ${
              scrolled ? 'text-gray-900' : 'text-white'
            }`}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-xl">
          <div className="px-6 py-4 space-y-3">
            <button
              onClick={() => {
                onHomeClick();
                setMobileMenuOpen(false);
              }}
              className="w-full px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium text-left"
            >
              Home
            </button>
            <button
              onClick={() => {
                onAboutClick();
                setMobileMenuOpen(false);
              }}
              className="w-full px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium text-left"
            >
              About Us
            </button>
            <button
              onClick={() => {
                onLoginClick();
                setMobileMenuOpen(false);
              }}
              className="w-full px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium text-left"
            >
              Log In
            </button>
            <button
              onClick={() => {
                onRegisterClick();
                setMobileMenuOpen(false);
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Header;