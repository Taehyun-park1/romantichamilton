import { useState } from 'react';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      toast.error('모든 항목을 입력해주세요.');
      return;
    }

    toast.success('문의가 접수되었습니다.');
    setFormData({ name: '', phone: '', message: '' });
  };

  return (
    <section id="contact" className="py-32 md:py-48 bg-background">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-serif font-normal text-foreground mb-20">
            Contact
          </h2>

          {/* Contact Info */}
          <div className="mb-16 space-y-6">
            <div>
              <h3 className="text-sm font-normal text-foreground/60 uppercase tracking-wide mb-2">
                Phone
              </h3>
              <a href="tel:+821012345678" className="text-lg text-foreground hover:text-foreground/60 transition-colors">
                +82 (10) 1234-5678
              </a>
            </div>
            <div>
              <h3 className="text-sm font-normal text-foreground/60 uppercase tracking-wide mb-2">
                Email
              </h3>
              <a href="mailto:hello@romantichamilton.com" className="text-lg text-foreground hover:text-foreground/60 transition-colors">
                hello@romantichamilton.com
              </a>
            </div>
            <div>
              <h3 className="text-sm font-normal text-foreground/60 uppercase tracking-wide mb-2">
                Address
              </h3>
              <p className="text-lg text-foreground">
                서울시 강남구 압구정로 123<br />
                Romantic Hamilton Workshop
              </p>
            </div>
            <div>
              <h3 className="text-sm font-normal text-foreground/60 uppercase tracking-wide mb-2">
                Hours
              </h3>
              <p className="text-lg text-foreground">
                Mon - Fri: 10:00 - 18:00<br />
                Sat: 11:00 - 17:00<br />
                Sun: Closed
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-normal text-foreground/60 mb-2">
                이름
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-0 py-2 border-b border-foreground/20 bg-transparent text-foreground focus:outline-none focus:border-foreground transition-colors"
                placeholder="성함을 입력해주세요"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-normal text-foreground/60 mb-2">
                연락처
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-0 py-2 border-b border-foreground/20 bg-transparent text-foreground focus:outline-none focus:border-foreground transition-colors"
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-normal text-foreground/60 mb-2">
                문의 내용
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className="w-full px-0 py-2 border-b border-foreground/20 bg-transparent text-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
                placeholder="문의 사항을 입력해주세요"
              />
            </div>

            <button type="submit" className="btn-primary mt-8">
              문의 접수
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
