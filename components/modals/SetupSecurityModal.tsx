import React, { useState } from 'react';
import Modal from './Modal';
import { localDb } from '../../services/localStorageDb';
import { hashPassword, SECURITY_QUESTIONS } from '../../utils/security';

interface SetupSecurityModalProps {
    onComplete: () => void;
    onNavigateToSettings?: () => void;
}

const SetupSecurityModal: React.FC<SetupSecurityModalProps> = ({ onComplete, onNavigateToSettings }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
    const [securityAnswer, setSecurityAnswer] = useState('');

    const handlePasswordNext = () => {
        if (!password || password.length < 4) {
            alert('❌ Mật khẩu phải có ít nhất 4 ký tự!');
            return;
        }
        if (password !== confirmPassword) {
            alert('❌ Mật khẩu xác nhận không khớp!');
            return;
        }
        setStep(2);
    };

    const handleComplete = async () => {
        if (!securityAnswer || securityAnswer.trim().length < 2) {
            alert('❌ Vui lòng nhập câu trả lời bảo mật!');
            return;
        }

        try {
            const passwordHash = await hashPassword(password);
            const answerHash = await hashPassword(securityAnswer.trim().toLowerCase());

            await localDb.setSecuritySettings({
                isSetup: true,
                passwordHash,
                securityQuestion,
                securityAnswerHash: answerHash
            });

            alert('✅ Đã thiết lập bảo mật thành công!\n\nTiếp theo: Vui lòng cài đặt giá điện/nước.');
            onComplete();
            // Navigate to settings after a short delay to let modal close
            if (onNavigateToSettings) {
                setTimeout(() => {
                    onNavigateToSettings();
                }, 300);
            }
        } catch (error) {
            console.error('Error setting up security:', error);
            alert('❌ Có lỗi xảy ra! Vui lòng thử lại.');
        }
    };

    return (
        <Modal onClose={() => {}}>
            <div className="p-4">
                {step === 1 ? (
                    <>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">🔒 Đặt mật khẩu Admin</h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Mật khẩu để bảo vệ dữ liệu khỏi xóa nhầm
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Mật khẩu (tối thiểu 4 ký tự)
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Nhập mật khẩu"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Xác nhận mật khẩu
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Nhập lại mật khẩu"
                                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordNext()}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handlePasswordNext}
                            className="w-full mt-4 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all active:scale-95"
                        >
                            Tiếp theo →
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">🔐 Câu hỏi bảo mật</h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Dùng để khôi phục khi quên mật khẩu
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Chọn câu hỏi
                                </label>
                                <select
                                    value={securityQuestion}
                                    onChange={(e) => setSecurityQuestion(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                >
                                    {SECURITY_QUESTIONS.map((q) => (
                                        <option key={q} value={q}>{q}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Câu trả lời
                                </label>
                                <input
                                    type="text"
                                    value={securityAnswer}
                                    onChange={(e) => setSecurityAnswer(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Nhập câu trả lời"
                                    autoFocus
                                    onKeyPress={(e) => e.key === 'Enter' && handleComplete()}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-all active:scale-95"
                            >
                                ← Quay lại
                            </button>
                            <button
                                onClick={handleComplete}
                                className="flex-1 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all active:scale-95"
                            >
                                Hoàn tất
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default SetupSecurityModal;

