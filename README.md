# 漢通 Hán Thông

## Tinh thông Hán tự

Từ điển Trung–Việt dành cho người Việt học tiếng Trung: rê chuột lên chữ Hán trên bất kỳ
trang web nào để xem ngay:

- **Pinyin** phía trên mỗi chữ
- **Chú âm** (Bopomofo) bên phải, theo chiều dọc
- **Âm Hán-Việt** phía dưới, chọn đúng âm theo cách đọc pinyin (行 xíng → hành, háng → hàng)
- **Nghĩa tiếng Việt** ở cột bên phải

Mỗi loại phiên âm bật/tắt được trong trang tùy chọn. Chữ Hán hiển thị bằng font chữ Khải
(楷書) đi kèm tiện ích.

Hán Thông là bản phát triển tiếp (fork) của [Zhongwen](https://github.com/cschiller/zhongwen)
của Christian Schiller.

## Tính năng

- Hỗ trợ cả chữ giản thể và phồn thể.
- Hiện từ khớp dài nhất với các nghĩa chính, kèm âm đọc và nghĩa của từng chữ trong từ.
- Tô màu pinyin và chú âm theo thanh điệu; cỡ chữ Hán 20–64 px (pinyin, chú âm, Hán-Việt theo tỷ lệ), bốn màu chữ Hán, sáu nền (kể cả tự động sáng/tối theo hệ thống).
- Bật/tắt bằng một cú nhấp vào biểu tượng trên thanh công cụ.
- Tùy chọn chỉ tra từ khi giữ phím `Shift`, `Ctrl` hoặc `Alt`, cho người đã đọc khá và chỉ thỉnh thoảng cần tra.
- Phím tắt để chuyển sang từ/chữ tiếp theo (`n`, `m`, `b`); bảng phím tắt hiện ra mỗi khi bật tiện ích.
- Danh sách từ vựng tích hợp (phím `r`, mở bằng `Alt+W`), có thể xuất ra file để nhập vào Anki.

## Dữ liệu

| Dữ liệu | Nguồn | Giấy phép |
|---|---|---|
| Nghĩa tiếng Việt | [CVDICT](https://github.com/ph0ngp/CVDICT) (Phong Phan) | CC BY-SA 4.0 |
| Âm Hán-Việt theo pinyin | [hanviet-pinyin-wordlist](https://github.com/ph0ngp/hanviet-pinyin-wordlist) (Phong Phan) | MIT |
| Từ chưa có trong CVDICT | [CC-CEDICT](https://cc-cedict.org/wiki/) | CC BY-SA 4.0 |
| Font chữ Khải | [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) (bản rút gọn) | SIL OFL 1.1 |
| Font chú âm | [Noto Sans TC](https://github.com/notofonts/noto-cjk) (chỉ ký hiệu chú âm và dấu thanh) | SIL OFL 1.1 |
| Nghĩa bổ sung, sửa âm Hán-Việt | Hán Thông | CC BY-SA 4.0 |

Nghĩa tiếng Việt trong CVDICT phần lớn được dịch tự động bằng AI rồi rà soát lại, nên vẫn có thể còn sót lỗi.

## Quyền riêng tư

Hán Thông chạy hoàn toàn trên máy, không gửi dữ liệu lên Internet. Xem [PRIVACY.md](PRIVACY.md).

## Phát triển

Từ điển (`data/`) và font (`fonts/`) đã được sinh sẵn; không cần bước build nào để chạy tiện ích.

Đóng gói để tải lên Chrome Web Store:

```bash
npm run package
```

Cài thử: mở `chrome://extensions`, bật *Developer mode*, chọn *Load unpacked* và trỏ tới thư mục này.

## Giấy phép

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

Xem [CREDITS.md](CREDITS.md) để biết tác giả và nguồn dữ liệu.

---

*Copyright (C) 2026 Christian Schiller* (Zhongwen)
