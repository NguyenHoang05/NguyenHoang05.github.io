# NCKH Web
🚀 TOÀN BỘ CÂU LỆNH ĐẨY CODE LÊN GITHUB:
# 1. Kiểm tra remote có tồn tại chưa
git remote -v

# 2. Nếu chưa có remote thì thêm remote origin
git remote add origin https://github.com/NguyenHoang05/NguyenHoang05.github.io.git

# 3. Đảm bảo bạn đang ở đúng nhánh (main)
git branch -M main

# 4. Kiểm tra các thay đổi đang chờ commit
git status

# 5. Thêm toàn bộ thay đổi vào stage
git add .

# 6. Commit thay đổi với thông điệp
git commit -m "Cập nhật README.md"

# 7. Đẩy code lên nhánh main của GitHub
git push -u origin main
# LƯU Ý NHÉ:
LỆNH ĐẨY LÊN SAU KHI ĐÃ SETUP
# git add .
# git commit -m "ghi nd cập nhật vào đây"
# git push origin main 

# KHÔI PHỤC FILE BỊ MẤT HOẶC DO THAO TÁC LỖI DẪN ĐẾN HẬU QUẢ HÚ HỒN
# git log --oneline 		//hiện danh sách commit
# git checkout 8h9i0j1 -- .	//mã 8h9i0j1 là các tệp muốn khôi phục
# git add .
# git commit -m "Khôi phục toàn bộ file từ commit 8h9i0j1"
# git push origin main
