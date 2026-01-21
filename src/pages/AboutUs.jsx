import React, { useState } from "react";
import { Target, Heart, Zap, Users, Award, ArrowRight, CheckCircle, MessageSquare } from "lucide-react";

function AboutUs({ onHomeClick }) {
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="font-sans text-gray-900 bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-blue-800 pt-20">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-black leading-tight text-white mb-6">
              About
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                ELEV8
              </span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Transforming the way you experience billiards through innovation, efficiency, and modern technology.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
                <p>
                  The Elev8 Billiard Hall System was created with a simple yet powerful mission: to provide a faster, smoother, and more convenient way for customers and staff to manage billiard table reservations.
                </p>
                <p>
                  We recognized that traditional booking methods were inefficient, often leading to long waiting times and frustration. So we decided to build something better—a modern solution designed for people of all ages.
                </p>
                <p>
                  Today, Elev8 stands as a testament to how technology can enhance everyday experiences, making every visit to a billiard hall more enjoyable and hassle-free.
                </p>
              </div>
            </div>
            <div className="relative h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur-3xl opacity-30 animate-pulse"></div>
              <div className="relative rounded-3xl shadow-2xl w-full h-full overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center border-4 border-white/10">
                <div className="text-center text-white">
                  <Target className="w-24 h-24 mx-auto mb-4 opacity-80" />
                  <p className="text-2xl font-bold">Innovation in Motion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Our Mission & Vision
            </h2>
            <p className="text-xl text-gray-600">What drives us every day</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Mission */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative bg-white p-12 rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="inline-flex p-4 bg-blue-100 rounded-2xl mb-6">
                  <Heart className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  To support better organization, reduce long waiting times, and make every transaction easier for customers and staff. We're committed to delivering a hassle-free experience from start to finish.
                </p>
              </div>
            </div>

            {/* Vision */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative bg-white p-12 rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="inline-flex p-4 bg-cyan-100 rounded-2xl mb-6">
                  <Zap className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  To bring efficiency, comfort, and modern technology together to elevate every customer's billiard experience. We envision a future where booking and playing billiards is seamless and enjoyable for everyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full mb-4">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">CORE VALUES</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              What We Stand For
            </h2>
            <p className="text-xl text-gray-600">Principles that guide our every decision</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: "Innovation",
                description: "Constantly evolving to bring the latest technology to billiards",
                color: "blue"
              },
              {
                icon: Users,
                title: "Community",
                description: "Building a thriving community of billiard enthusiasts and players",
                color: "cyan"
              },
              {
                icon: CheckCircle,
                title: "Reliability",
                description: "Providing consistent, dependable service you can always count on",
                color: "green"
              },
              {
                icon: MessageSquare,
                title: "Customer-First",
                description: "Listening to your feedback and continuously improving our service",
                color: "purple"
              }
            ].map((value, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`inline-flex p-4 bg-${value.color}-100 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <value.icon className={`w-6 h-6 text-${value.color}-600`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Why Choose ELEV8?
            </h2>
            <p className="text-xl text-gray-600">Experience the difference that modern technology makes</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              "Real-time table availability at your fingertips",
              "Quick QR code verification system",
              "Simple and intuitive booking process",
              "Flexible payment options",
              "Professional-grade tables",
              "Designed for all ages and skill levels",
              "24/7 accessibility",
              "Dedicated customer support"
            ].map((benefit, index) => (
              <div key={index} className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
            Ready to Experience ELEV8?
          </h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            Join our community and discover a better way to book and enjoy billiards
          </p>
          {onHomeClick && (
            <button
              onClick={onHomeClick}
              className="group px-10 py-5 bg-white text-gray-900 rounded-xl hover:shadow-2xl hover:shadow-white/50 transition-all duration-300 font-bold text-lg flex items-center justify-center space-x-2 hover:scale-105 mx-auto"
            >
              <span>Back to Home</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

export default AboutUs;