import React, { useState, useEffect } from "react";
import { Facebook, Instagram, Mail, Phone, MapPin, Clock } from "lucide-react";

function Footer({ onAboutClick, onHomeClick }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="text-white bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="px-6 py-16 mx-auto max-w-7xl lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-gradient-to-br from-blue-600 to-cyan-600">
                <span className="text-sm font-bold text-white">E8</span>
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight">
                  ELEV<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">8</span>
                </span>
                <div className="text-xs tracking-wider text-gray-400">BILLIARDS</div>
              </div>
            </div>
            <p className="leading-relaxed text-gray-400">
              Modern billiard reservation system designed for convenience and efficiency.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 transition-all duration-300 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-110"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 transition-all duration-300 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-110"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-bold">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={onHomeClick}
                  className="flex items-center space-x-2 text-gray-400 transition-colors duration-300 hover:text-white group"
                >
                  <span className="w-0 h-0.5 bg-cyan-400 group-hover:w-4 transition-all duration-300"></span>
                  <span>Home</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onAboutClick}
                  className="flex items-center space-x-2 text-gray-400 transition-colors duration-300 hover:text-white group"
                >
                  <span className="w-0 h-0.5 bg-cyan-400 group-hover:w-4 transition-all duration-300"></span>
                  <span>About Us</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-lg font-bold">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3 text-gray-400">
                <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>123 Billiard Street, Quezon City, Metro Manila, Philippines</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400">
                <Phone className="flex-shrink-0 w-5 h-5 text-cyan-400" />
                <span>+63 912 345 6789</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400">
                <Mail className="flex-shrink-0 w-5 h-5 text-cyan-400" />
                <span>elev8billiardhalls@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Operating Hours */}
          <div>
            <h3 className="mb-4 text-lg font-bold">Operating Hours</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 text-gray-400">
                <Clock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Monday - Friday</p>
                  <p>10:00 AM - 2:00 AM</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-gray-400">
                <Clock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Saturday - Sunday</p>
                  <p>12:00 PM - 3:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-12 border-t border-white/10">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p className="text-sm text-center text-gray-400 md:text-left">
              © {currentYear} ELEV8 Billiards. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;