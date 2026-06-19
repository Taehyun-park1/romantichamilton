import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.replace(/\/+$/, '');

export default function Contact() {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
    website: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData((previous) => ({
      ...previous,
      name: previous.name || profile?.display_name || '',
      email: previous.email || profile?.email || '',
    }));
  }, [profile?.display_name, profile?.email]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      toast.error('이름, 연락처, 이메일, 문의 내용을 모두 입력해 주세요.');
      return;
    }

    // A hidden honeypot field blocks simple form bots without storing any data.
    if (formData.website) {
      toast.success('문의가 이메일로 전송되었습니다.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl ?? ''}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const requestError = new Error('contact_send_failed') as Error & {
          status?: number;
        };
        requestError.status = response.status;
        throw requestError;
      }

      toast.success('문의가 이메일로 전송되었습니다.');
      setFormData({
        name: profile?.display_name ?? '',
        phone: '',
        email: profile?.email ?? '',
        message: '',
        website: '',
      });
    } catch (error) {
      const requestError = error as Error & { status?: number };
      console.error('Contact email send failed', requestError);
      toast.error(
        requestError.status === 429
          ? '문의가 너무 자주 전송되었습니다. 잠시 후 다시 시도해 주세요.'
          : '문의 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="scroll-mt-20 bg-[#f4f0ea] py-24 md:scroll-mt-24 md:py-36"
    >
      <div className="container">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              Contact
            </p>
            <h2 className="mb-8 text-3xl font-semibold text-foreground md:text-5xl">
              제작 문의
            </h2>

            <div className="space-y-7">
              <div>
                <h3 className="mb-2 text-xs font-normal uppercase tracking-[0.14em] text-foreground/50">
                  Phone
                </h3>
                <a
                  href="tel:+821012345678"
                  className="text-lg text-foreground transition-colors hover:text-accent"
                >
                  +82 10-1234-5678
                </a>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-normal uppercase tracking-[0.14em] text-foreground/50">
                  Email
                </h3>
                <a
                  href="mailto:hello@romantichamilton.com"
                  className="text-lg text-foreground transition-colors hover:text-accent"
                >
                  hello@romantichamilton.com
                </a>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-normal uppercase tracking-[0.14em] text-foreground/50">
                  Hours
                </h3>
                <p className="text-lg text-foreground">
                  평일 10:00 - 18:00
                  <br />
                  토요일 11:00 - 17:00
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label
                htmlFor="contact-name"
                className="mb-2 block text-sm font-normal text-foreground/60"
              >
                이름
              </label>
              <input
                type="text"
                id="contact-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                maxLength={60}
                required
                className="w-full border-b border-foreground/20 bg-transparent px-0 py-3 text-foreground transition-colors focus:border-foreground focus:outline-none"
                placeholder="성함을 입력해 주세요"
              />
            </div>

            <div className="grid gap-7 md:grid-cols-2">
              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-2 block text-sm font-normal text-foreground/60"
                >
                  연락처
                </label>
                <input
                  type="tel"
                  id="contact-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  maxLength={30}
                  required
                  className="w-full border-b border-foreground/20 bg-transparent px-0 py-3 text-foreground transition-colors focus:border-foreground focus:outline-none"
                  placeholder="010-1234-5678"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-2 block text-sm font-normal text-foreground/60"
                >
                  이메일
                </label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  maxLength={254}
                  required
                  className="w-full border-b border-foreground/20 bg-transparent px-0 py-3 text-foreground transition-colors focus:border-foreground focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="mb-2 block text-sm font-normal text-foreground/60"
              >
                문의 내용
              </label>
              <textarea
                id="contact-message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                minLength={10}
                maxLength={3000}
                required
                className="w-full resize-none border-b border-foreground/20 bg-transparent px-0 py-3 text-foreground transition-colors focus:border-foreground focus:outline-none"
                placeholder="원하시는 제품, 색상, 각인 여부 등을 적어 주세요"
              />
            </div>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                type="text"
                id="contact-website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? '전송 중' : '문의 보내기'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
