### Hán Thông

Hán Thông là bản phát triển tiếp (fork) của tiện ích Zhongwen, dành cho người Việt học
tiếng Trung. Mã nguồn được phát hành theo giấy phép GNU GPL phiên bản 2 trở lên,
giống như Zhongwen.

Dữ liệu và font chữ đi kèm:

* Nghĩa tiếng Việt: CVDICT của Phong Phan, bản dịch tiếng Việt của CC-CEDICT,
  giấy phép CC BY-SA 4.0 (https://github.com/ph0ngp/CVDICT)

* Âm Hán-Việt theo pinyin: hanviet-pinyin-wordlist của Phong Phan,
  giấy phép MIT (https://github.com/ph0ngp/hanviet-pinyin-wordlist)

* Từ chưa có trong CVDICT (chỉ dùng chữ Hán và pinyin): CC-CEDICT,
  giấy phép CC BY-SA 4.0 (https://www.mdbg.net/chinese/dictionary?page=cedict)

* Font chữ Khải: LXGW WenKai (霞鹜文楷) của LXGW, giấy phép SIL Open Font
  License 1.1 (https://github.com/lxgw/LxgwWenKai). Bản đi kèm chỉ chứa một
  phần các chữ; xem fonts/OFL.txt.

* Font chú âm: Noto Sans TC của Google và Adobe, giấy phép SIL Open Font
  License 1.1 (https://github.com/notofonts/noto-cjk). Bản đi kèm
  (fonts/HanThongZhuyin.woff2, lấy từ ứng dụng Hán Thông) chỉ chứa các ký hiệu
  chú âm và dấu thanh; xem fonts/NotoSansTC-OFL.txt.

Từ điển gộp trong data/dict.u8 được sinh từ các nguồn trên, cùng các nghĩa
bổ sung và các âm Hán-Việt đã sửa của Hán Thông, và cũng được phân phối theo
giấy phép CC BY-SA 4.0.

### Contributors

The Zhongwen Chrome extension was written by Christian Schiller with
contributions from the following people:

* Todd Rudick (http://rikaixul.mozdev.org/)

* Jonathan Zarate (http://www.polarcloud.com/)

* Erek Speed (http://code.google.com/p/rikaikun/)

* Lenoard Lausen (https://github.com/leezu)

Furthermore, Zhongwen would not be possible without the work of all the editors
who put together, and constantly improve and update, the
CC-CEDICT dictionary: https://www.mdbg.net/chinese/dictionary?page=cedict

I also want to thank John Pasden from AllSet Learning
(https://www.allsetlearning.com/about/) for creating, and suggesting
Zhongwen be integrated with, the Chinese Grammar Wiki.
(https://resources.allsetlearning.com/chinese/grammar/)

Thanks also to Nick Winter from Skritter for his assistance with
setting up the API for integrating Zhongwen with Skritter.
(https://skritter.com/)
