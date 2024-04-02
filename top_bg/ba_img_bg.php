<?php

// 存储图片直链的数组
$imageLinks = array(
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/X0_6rTZl.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/dTTcmJH0.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/wd0C_zTo.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/2PvxbRjv.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/qla2kEBs.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/JLmtYT2S.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/dMIq1HzJ.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/ffJ4RBzt.jpeg",
    "https://webcnstatic.yostar.net/ba_cn_web/prod/upload/wallpaper/gzp2DYV2.jpeg",
    // 添加剩下的图片链接
);

// 生成一个随机数，范围为数组索引的长度
$randomIndex = rand(0, count($imageLinks) - 1);

// 从数组中获取随机索引对应的图片链接
$randomImage = $imageLinks[$randomIndex];

// 重定向到随机选择的图片链接
header("Location: $randomImage");
exit;
?>