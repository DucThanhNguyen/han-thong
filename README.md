# 漢通 Hán Thông

## Từ điển Trung–Việt khi rê chuột, dành cho người Việt học tiếng Trung

Rê chuột lên chữ Hán trên bất kỳ trang web nào để xem ngay:

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
- Chỉ hiện từ khớp dài nhất và các nghĩa chính, để đọc nhanh mà không bị rối mắt.
- Tô màu pinyin và chú âm theo thanh điệu, ba cỡ chữ, năm màu nền.
- Bật/tắt bằng một cú nhấp vào biểu tượng trên thanh công cụ.
- Phím tắt để chuyển sang từ/chữ tiếp theo (`n`, `m`, `b`); bảng phím tắt hiện ra mỗi khi bật tiện ích.
- Danh sách từ vựng tích hợp (phím `r`, mở bằng `Alt+W`), có thể xuất ra file để nhập vào Anki.

## Dữ liệu

| Dữ liệu | Nguồn | Giấy phép |
|---|---|---|
| Nghĩa tiếng Việt | [CVDICT](https://github.com/ph0ngp/CVDICT) (Phong Phan) | CC BY-SA 4.0 |
| Âm Hán-Việt theo pinyin | [hanviet-pinyin-wordlist](https://github.com/ph0ngp/hanviet-pinyin-wordlist) (Phong Phan) | MIT |
| Từ chưa có trong CVDICT | [CC-CEDICT](https://cc-cedict.org/wiki/) | CC BY-SA 4.0 |
| Font chữ Khải | [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) (bản rút gọn) | SIL OFL 1.1 |

Nghĩa tiếng Việt trong CVDICT phần lớn được dịch tự động bằng AI rồi rà soát lại, nên vẫn có thể còn sót lỗi.

## Quyền riêng tư

Hán Thông chạy hoàn toàn trên máy, không gửi dữ liệu lên Internet. Xem [PRIVACY.md](PRIVACY.md).

## Phát triển

Dữ liệu gốc nằm trong `data-src/`. Sau khi cập nhật dữ liệu gốc, sinh lại từ điển:

```bash
npm run build:dict
```

Sinh lại font chữ Khải (cần `pip install fonttools brotli` và file `LXGWWenKai-Regular.ttf`):

```bash
npm run build:font -- path/to/LXGWWenKai-Regular.ttf
```

Xem trước cửa sổ tra từ mà không cần cài tiện ích:

```bash
python3 -m http.server 8080
```

rồi mở http://localhost:8080/tools/preview.html?words=修炼,银行,行

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
