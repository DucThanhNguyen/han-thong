# Chính sách quyền riêng tư – Hán Thông

*Cập nhật: 11/10/2026*

Hán Thông là tiện ích từ điển Trung–Việt cho trình duyệt Chrome. Tiện ích **không thu thập,
không lưu trữ trên máy chủ và không chia sẻ** bất kỳ dữ liệu nào của người dùng.

## Tiện ích xử lý những gì

- **Chữ trên trang web:** khi tiện ích đang bật, chữ Hán nằm dưới con trỏ chuột (tối đa 30 ký tự)
  được tra trong từ điển đi kèm tiện ích. Việc tra từ diễn ra hoàn toàn trên máy của bạn,
  chữ được tra không được gửi đi đâu.
- **Tùy chọn và danh sách từ vựng:** được lưu bằng `chrome.storage.local` trên máy của bạn,
  không đồng bộ lên tài khoản Google hay bất kỳ máy chủ nào. Gỡ tiện ích sẽ xóa các dữ liệu này.
- **Sao chép và xuất file:** chỉ diễn ra khi bạn nhấn phím `c` (sao chép) hoặc nút
  "Lưu các dòng đã chọn" (xuất file về máy).

## Những gì tiện ích không làm

- Không gửi yêu cầu mạng nào ra Internet. Từ điển, âm Hán-Việt và font chữ đều nằm sẵn trong tiện ích.
- Không dùng công cụ phân tích, quảng cáo hay theo dõi.
- Không đọc lịch sử duyệt web, mật khẩu, cookie hay nội dung biểu mẫu.
- Không bán hay chuyển giao dữ liệu cho bên thứ ba.

## Quyền mà tiện ích yêu cầu

| Quyền | Dùng để |
|---|---|
| Đọc và thay đổi dữ liệu trên các trang web (content script) | Đọc chữ Hán dưới con trỏ chuột và hiện cửa sổ tra từ |
| `activeTab`, `scripting` | Nạp chức năng tra từ vào tab đang mở khi bạn bật tiện ích |
| `tabs` | Chuyển sang tab danh sách từ vựng hoặc hướng dẫn nếu đã mở, thay vì mở tab mới |
| `storage` | Lưu tùy chọn và danh sách từ vựng trên máy |
| `contextMenus` | Thêm mục "Mở danh sách từ vựng" và "Xem hướng dẫn" vào menu chuột phải |

## Mã nguồn

Hán Thông là phần mềm mã nguồn mở theo giấy phép GNU GPL. Bạn có thể kiểm tra toàn bộ mã nguồn tại
https://github.com/DucThanhNguyen/han-thong

## Liên hệ

Mọi câu hỏi về quyền riêng tư, vui lòng tạo issue tại
https://github.com/DucThanhNguyen/han-thong/issues

---

# Privacy Policy – Hán Thông

Hán Thông is a Chinese–Vietnamese dictionary extension for Chrome. It **does not collect, store on
any server, or share** any user data.

- Chinese text under the mouse pointer (at most 30 characters) is looked up in a dictionary bundled
  with the extension, entirely on your device. Nothing is sent over the network.
- Options and the word list are kept in `chrome.storage.local` on your device and are removed when
  the extension is uninstalled.
- The extension makes no network requests, uses no analytics, advertising or tracking, and does not
  sell or transfer data to third parties.

Source code: https://github.com/DucThanhNguyen/han-thong
