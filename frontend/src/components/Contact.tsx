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
      toast.error('이름, 연락처, 문의 내용을 모두 입력해 주세요.');
      return;
    }

    toast.success('문의가 접수되었습니다.');
    setFormData({ name: '', phone: '', message: '' });
  };

  return (
    <section
      id="contact"
      className="scroll-mt-20 md:scroll-mt-24 py-24 md:py-36 bg-[#f4f0ea]"
    >
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              Contact
            </p>
            <h2 className="text-3xl md:text-5xl font-serif font-normal text-foreground mb-8">
              제작 문의
            </h2>

            <div className="space-y-7">
              <div>
                <h3 className="text-xs font-normal text-foreground/50 uppercase tracking-[0.14em] mb-2">
                  Phone
                </h3>
                <a href="tel:+821012345678" className="text-lg text-foreground hover:text-accent transition-colors">
                  +82 10-1234-5678
                </a>
              </div>
              <div>
                <h3 className="text-xs font-normal text-foreground/50 uppercase tracking-[0.14em] mb-2">
                  Email
                </h3>
                <a href="mailto:hello@romantichamilton.com" className="text-lg text-foreground hover:text-accent transition-colors">
                  hello@romantichamilton.com
                </a>
              </div>
              <div>
                <h3 className="text-xs font-normal text-foreground/50 uppercase tracking-[0.14em] mb-2">
                  Hours
                </h3>
                <p className="text-lg text-foreground">
                  월-금 10:00 - 18:00<br />
                  토 11:00 - 17:00
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
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
                className="w-full px-0 py-3 border-b border-foreground/20 bg-transparent text-foreground focus:outline-none focus:border-foreground transition-colors"
                placeholder="성함을 입력해 주세요"
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
                className="w-full px-0 py-3 border-b border-foreground/20 bg-transparent text-foreground focus:outline-none focus:border-foreground transition-colors"
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
                className="w-full px-0 py-3 border-b border-foreground/20 bg-transparent text-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
                placeholder="원하는 제품, 색상, 각인 여부를 적어 주세요"
              />
            </div>

            <button type="submit" className="btn-primary">
              문의 보내기
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
