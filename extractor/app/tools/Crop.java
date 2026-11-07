import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;

public class Crop {
    // args: src x y w h dst [pad]
    public static void main(String[] a) throws Exception {
        BufferedImage img = ImageIO.read(new File(a[0]));
        int pad = a.length > 6 ? Integer.parseInt(a[6]) : 8;
        int x = Math.max(0, Integer.parseInt(a[1]) - pad);
        int y = Math.max(0, Integer.parseInt(a[2]) - pad);
        int w = Math.min(img.getWidth() - x, Integer.parseInt(a[3]) + pad * 2);
        int h = Math.min(img.getHeight() - y, Integer.parseInt(a[4]) + pad * 2);
        BufferedImage out = img.getSubimage(x, y, w, h);
        ImageIO.write(out, "png", new File(a[5]));
        System.out.println("wrote " + a[5] + " " + w + "x" + h);
    }
}
