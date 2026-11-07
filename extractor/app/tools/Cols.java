import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;

public class Cols {
    public static void main(String[] a) throws Exception {
        BufferedImage img = ImageIO.read(new File(a[0]));
        int y0 = Integer.parseInt(a[1]), y1 = Integer.parseInt(a[2]);
        int w = img.getWidth();
        boolean[] ink = new boolean[w];
        for (int x = 0; x < w; x++) {
            for (int y = y0; y <= y1; y++) {
                int p = img.getRGB(x, y);
                int r = (p >> 16) & 0xff, g = (p >> 8) & 0xff, b = p & 0xff;
                if (r < 235 || g < 235 || b < 235) { ink[x] = true; break; }
            }
        }
        int start = -1;
        for (int x = 0; x <= w; x++) {
            boolean on = x < w && ink[x];
            if (on && start < 0) start = x;
            if (!on && start >= 0) {
                System.out.println("x=" + start + ".." + (x - 1) + " w=" + (x - start));
                start = -1;
            }
        }
    }
}
