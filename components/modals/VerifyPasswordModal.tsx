import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { localDb } from '../../services/localStorageDb';
import { verifyPassword, hashPassword } from '../../utils/security';

interface VerifyPasswordModalProps {
    onClose: () => void;
    onVerified: () => void;
    title?: string;
    description?: string;
}

const VerifyPasswordModal: React.FC<VerifyPasswordModalProps> = ({
    onClose,
    onVerified,
    title = '🔒 Nhập mật khẩu Admin',
    description = 'Để thực hiện thao tác này'
}) => {
    const [password, setPassword] = useState('');
    const [showSecurityQuestion, setShowSecurityQuestion] = useState(false);
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const loadSecurity = async () => {
            const security = await localDb.getSecuritySettings();
            if (security) {
                setSecurityQuestion(security.securityQuestion);
            }
        };
        loadSecurity();
    }, []);

    const handleVerifyPassword = async () => {
        if (!password) {
            alert('❌ Vui lòng nhập mật khẩu!');
            return;
        }

        setIsVerifying(true);
        try {
            const security = await localDb.getSecuritySettings();
            if (!security) {
                alert('❌ Chưa thiết lập mật khẩu!');
                return;
            }

            const isValid = await verifyPassword(password, security.passwordHash);
            if (isValid) {
                onVerified();
                onClose();
            } else {
                alert('❌ Mật khẩu sai!\n\nBấm "Quên mật khẩu?" để khôi phục.');
                setPassword('');
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            alert('❌ Có lỗi xảy ra!');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifySecurityAnswer = async () => {
        if (!securityAnswer) {
            alert('❌ Vui lòng nhập câu trả lời!');
            return;
        }

        setIsVerifying(true);
        try {
            const security = await localDb.getSecuritySettings();
            if (!security) {
                alert('❌ Chưa thiết lập bảo mật!');
                return;
            }

            const answerHash = await hashPassword(securityAnswer.trim().toLowerCase());
            if (answerHash === security.securityAnswerHash) {
                // Security answer correct - allow access
                onVerified();
                onClose();
            } else {
                alert('❌ Câu trả lời sai!\n\nVui lòng thử lại.');
                setSecurityAnswer('');
            }
        } catch (error) {
            console.error('Error verifying security answer:', error);
            alert('❌ Có lỗi xảy ra!');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="p-4">
                {!showSecurityQuestion ? (
                    <>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
                        <p className="text-sm text-slate-600 mb-4">{description}</p>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mật khẩu
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Nhập mật khẩu Admin"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
                                disabled={isVerifying}
                            />
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setShowSecurityQuestion(true)}
                                className="flex-1 py-2.5 text-sm text-blue-600 font-semibold hover:text-blue-700 active:scale-95"
                                disabled={isVerifying}
                            >
                                Quên mật khẩu?
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-all active:scale-95"
                                disabled={isVerifying}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleVerifyPassword}
                                className="flex-1 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all active:scale-95"
                                disabled={isVerifying}
                            >
                                {isVerifying ? 'Đang kiểm tra...' : 'Xác nhận'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">🔐 Câu hỏi bảo mật</h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Trả lời đúng để xác nhận
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {securityQuestion}
                            </label>
                            <input
                                type="text"
                                value={securityAnswer}
                                onChange={(e) => setSecurityAnswer(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Nhập câu trả lời"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleVerifySecurityAnswer()}
                                disabled={isVerifying}
                            />
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setShowSecurityQuestion(false)}
                                className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-all active:scale-95"
                                disabled={isVerifying}
                            >
                                ← Quay lại
                            </button>
                            <button
                                onClick={handleVerifySecurityAnswer}
                                className="flex-1 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all active:scale-95"
                                disabled={isVerifying}
                            >
                                {isVerifying ? 'Đang kiểm tra...' : 'Xác nhận'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default VerifyPasswordModal;

